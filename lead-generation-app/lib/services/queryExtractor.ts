import {
  SearchFiltersSchema,
  type SearchFilters,
} from "../schemas/searchFilters";
import { initializeGroqLLM } from "../llm/groqClient";

export async function extractSearchFilters(
  query: string
): Promise<SearchFilters> {
  const llm = initializeGroqLLM();
  const structuredLlm = llm.withStructuredOutput(SearchFiltersSchema);

  console.log(`Analyzing query with Llama 3.3: "${query}"...`);

  // 4. EXECUTE EXTRACTION
  const extractionResult = await structuredLlm.invoke(
    `You are a search query optimizer for a database of Y Combinator companies.
       Your goal is to split the user's query into 'Hard Filters' (metadata) and a 'Semantic Search' (topic).
       
       Rules:
       1. **Filters:** Only extract filters if they strictly match the supported fields (Location, Batch, etc.).
       2. **Semantic Query:** This is the most important part. 
          - detailed descriptions of what the company does.
          - Include concepts that CANNOT be filtered (e.g., "founders from Stanford", "ex-Google", "building for lawyers").
          - **DO NOT** remove keywords unless they are successfully captured in a filter. 
          
       Example:
       Input: "B2B fintech in Europe with Stanford founders"
       Bad Output: { semantic_query: "fintech", location: "Europe" } (Lost "Stanford")
       Good Output: { semantic_query: "B2B fintech company founders from Stanford", location: "Europe" }
       
       User Query: "${query}"`
  );

  console.log("Groq Extraction Result:", extractionResult);

  return extractionResult;
}
