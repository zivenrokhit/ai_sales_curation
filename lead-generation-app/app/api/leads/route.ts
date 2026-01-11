import { type NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { InferenceClient } from "@huggingface/inference";
import { ChatGroq } from "@langchain/groq";
import { z } from "zod";
import { extractSearchFilters } from "@/lib/services/queryExtractor";

const INDEX_NAME = "ai-leads-project";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

const hfClient = new InferenceClient(process.env.HUGGINGFACE_API_KEY);

const explanationLLM = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0.1,
  apiKey: process.env.GROQ_API_KEY,
});

async function generateEmbedding(text: string): Promise<number[]> {
  const output = await hfClient.featureExtraction({
    model: "sentence-transformers/all-MiniLM-L6-v2",
    inputs: text,
    provider: "hf-inference",
  });
  return output as number[];
}

const ExplanationSchema = z.object({
  explanations: z.array(
    z.object({
      company_id: z.number().describe("The ID of the company being explained"),
      reason: z
        .string()
        .describe(
          "A 1-sentence explanation of why this fits the user's query."
        ),
    })
  ),
});

async function generateMatchExplanations(userQuery: string, matches: any[]) {
  if (matches.length === 0) return {};

  const companiesContext = matches.map((m) => ({
    id: m.company_id,
    name: m.company_name,
    desc: m.short_description,
    tags: m.tags,
  }));

  const structuredLlm = explanationLLM.withStructuredOutput(ExplanationSchema);

  console.log("Generatings explanations for", matches.length, "companies...");

  try {
    const result = await structuredLlm.invoke(
      `You are an expert sales analyst. 
       User Query: "${userQuery}"
       
       Analyze the provided list of companies and explain WHY each one is a good match for this specific query.
       - Be specific. Connect the user's need (e.g. "cloud database") to the company's offering.
       - Keep it to 1 short sentence per company.
       - If a company seems like a weak match, explain why (e.g. "Related to AI, but focuses on frontend").
       
       Companies Data:
       ${JSON.stringify(companiesContext)}`
    );

    const reasonMap: Record<number, string> = {};
    result.explanations.forEach((item) => {
      reasonMap[item.company_id] = item.reason;
    });
    return reasonMap;
  } catch (error) {
    console.error("Error generating explanations:", error);
    return {};
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Invalid query provided" },
        { status: 400 }
      );
    }

    const extraction = await extractSearchFilters(query);

    const queryVector = await generateEmbedding(extraction.semantic_query);

    const pineconeFilter: Record<string, any> = {};
    const excludedKeys = ["semantic_query", "company_name"];

    Object.entries(extraction).forEach(([key, value]) => {
      if (value === undefined || value === null || excludedKeys.includes(key))
        return;

      if (Array.isArray(value)) {
        if (value.length > 0) pineconeFilter[key] = { $in: value };
      } else {
        pineconeFilter[key] = { $eq: value };
      }
    });

    const index = pc.index(INDEX_NAME);
    const searchResults = await index.query({
      vector: queryVector as number[],
      filter: pineconeFilter,
      topK: 5,
      includeMetadata: true,
    });

    const rawMatches =
      searchResults.matches?.map((match) => ({
        id: match.id,
        score: match.score,
        ...((match.metadata as Record<string, unknown>) || {}),
      })) ?? [];

    const explanations = await generateMatchExplanations(query, rawMatches);

    const enrichedMatches = rawMatches.map((match: any) => ({
      ...match,
      ai_reason: explanations[match.company_id] || "No explanation available.",
    }));

    return NextResponse.json(
      {
        success: true,
        original_query: query,
        strategy: extraction,
        filters: pineconeFilter,
        match_count: enrichedMatches.length,
        matches: enrichedMatches,
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  } catch (error) {
    console.error("Error processing leads request:", error);
    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
