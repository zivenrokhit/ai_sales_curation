import { type NextRequest, NextResponse } from "next/server";
import { extractSearchFilters } from "@/lib/services/queryExtractor";

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

    return NextResponse.json({
      success: true,
      original_query: query,
      extraction,
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
