import { ChatGroq } from "@langchain/groq";

export function initializeGroqLLM() {
  return new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    apiKey: process.env.GROQ_API_KEY,
  });
}
