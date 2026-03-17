import OpenAI from "openai";
import { LLMMessage, LLMProvider, LLMResponse } from "./llm.interface";
import { env } from "../../../../lib/env";

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor() {
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  async generateResponse(messages: LLMMessage[], model = "gpt-4-turbo"): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    return {
      content: response.choices[0]?.message?.content || "",
      tokensUsed: response.usage?.total_tokens,
    };
  }
}
