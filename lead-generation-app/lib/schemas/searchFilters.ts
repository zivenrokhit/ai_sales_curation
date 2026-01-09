import { z } from "zod";

export const SearchFiltersSchema = z.object({
  semantic_query: z
    .string()
    .describe(
      "A simplified, keyword-focused version of the user's query for vector search."
    ),

  company_name: z.string().optional().describe("Company name if mentioned."),

  batch: z.string().optional().describe("YC Batch (e.g., 'W24', 'S23')."),

  status: z.enum(["Active", "Acquired", "Dead", "Public"]).optional(),

  tags: z
    .array(z.string())
    .optional()
    .describe("Industry tags (lowercase, hyphenated)."),

  location: z.string().optional().describe("City or region."),

  country: z.string().optional().describe("Country code (2 letters) or name."),

  year_founded: z.number().optional(),

  num_founders: z.number().optional(),

  team_size: z.number().optional(),
});

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
