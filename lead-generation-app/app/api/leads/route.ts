import { type NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { pipeline } from "@huggingface/transformers";
import { extractSearchFilters } from "@/lib/services/queryExtractor";

const INDEX_NAME = "ai-leads-project";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
let embeddingPipeline: any = null;

async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
  }
  return embeddingPipeline;
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
    const generateEmbedding = await getEmbeddingPipeline();

    const output = await generateEmbedding(extraction.semantic_query, {
      pooling: "mean",
      normalize: true,
    });
    const queryVector = Array.from(output.data);

    const pineconeFilter: Record<string, any> = {};
    const excludedKeys = ["semantic_query", "company_name"];

    Object.entries(extraction).forEach(([key, value]) => {
      if (value === undefined || value === null || excludedKeys.includes(key))
        return;

      if (Array.isArray(value)) {
        if (value.length > 0) {
          pineconeFilter[key] = { $in: value };
        }
      } else {
        pineconeFilter[key] = { $eq: value };
      }
    });

    const index = pc.index(INDEX_NAME);
    const searchResults = await index.query({
      vector: queryVector as number[],
      filter: pineconeFilter,
      topK: 10,
      includeMetadata: true,
    });

    const matches =
      searchResults.matches?.map((match) => ({
        id: match.id,
        score: match.score,
        ...((match.metadata as Record<string, unknown>) || {}),
      })) ?? [];

    return NextResponse.json({
      success: true,
      original_query: query,
      strategy: extraction,
      filters: pineconeFilter,
      match_count: matches.length,
      matches,
    });
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
