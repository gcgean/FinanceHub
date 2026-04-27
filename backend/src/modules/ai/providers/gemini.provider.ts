import { GoogleGenerativeAI } from "@google/generative-ai";
import { LLMMessage, LLMProvider, LLMResponse } from "./llm.interface.js";
import { env } from "../../../lib/env.js";

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    const key = apiKey || env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY not configured");
    }
    this.client = new GoogleGenerativeAI(key);
  }

  async generateResponse(messages: LLMMessage[], model = "gemini-1.5-pro"): Promise<LLMResponse> {
    const generativeModel = this.client.getGenerativeModel({ model });

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];
    const chat = generativeModel.startChat({
      history: history.length > 0 ? history : undefined,
    });

    const result = await chat.sendMessage(lastMessage.content);
    const response = await result.response;

    return {
      content: response.text(),
      // Gemini doesn't always return token usage easily in this SDK version without extra calls, 
      // keeping it simple for now.
      tokensUsed: 0, 
    };
  }
}
