import Anthropic from "@anthropic-ai/sdk";
import { LLMMessage, LLMProvider, LLMResponse } from "./llm.interface.js";
import { env } from "../../../lib/env.js";

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor(apiKey?: string) {
    const key = apiKey || env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }
    this.client = new Anthropic({ apiKey: key });
  }

  async generateResponse(messages: LLMMessage[], model = "claude-sonnet-4-6"): Promise<LLMResponse> {
    const systemMessage = messages.find((m) => m.role === "system")?.content;
    const chatMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const response = await this.client.messages.create({
      model,
      system: systemMessage,
      messages: chatMessages,
      max_tokens: 4096,
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "";

    return {
      content,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  }
}
