import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Invalid query provided" }, { status: 400 })
    }

    console.log("Received leads query:", query)

    return NextResponse.json({
      success: true,
      message: "Your request has been received. Our AI is processing your lead criteria.",
      query,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error processing leads request:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
