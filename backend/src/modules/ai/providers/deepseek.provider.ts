import OpenAI from "openai";
import { LLMMessage, LLMProvider, LLMResponse } from "./llm.interface.js";
import { env } from "../../../lib/env.js";

/**
 * DeepSeek expõe uma API compatível com a da OpenAI, então reaproveitamos o
 * mesmo SDK apenas trocando a baseURL — sem dependência nova.
 */
export class DeepSeekProvider implements LLMProvider {
  private client: OpenAI;
  private defaultModel: string;

  constructor(apiKey?: string, model?: string) {
    const key = apiKey || env.DEEPSEEK_API_KEY;
    if (!key) {
      throw new Error("DEEPSEEK_API_KEY not configured");
    }
    this.client = new OpenAI({ apiKey: key, baseURL: "https://api.deepseek.com" });
    this.defaultModel = model?.trim() || "deepseek-chat";
  }

  async generateResponse(messages: LLMMessage[], model?: string): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: model || this.defaultModel,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      // 8192 evita o corte de relatórios longos (semanal/mensal com muitos técnicos).
      max_tokens: 8192,
    });

    return {
      content: response.choices[0]?.message?.content || "",
      tokensUsed: response.usage?.total_tokens,
      truncated: response.choices[0]?.finish_reason === "length",
    };
  }

  async generateResponseStream(
    messages: LLMMessage[],
    onChunk: (delta: string) => void,
    model?: string
  ): Promise<LLMResponse> {
    const stream = await this.client.chat.completions.create({
      model: model || this.defaultModel,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 8192,
      stream: true,
    });

    let content = "";
    let truncated = false;
    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content ?? "";
      if (delta) {
        content += delta;
        onChunk(delta);
      }
      if (part.choices[0]?.finish_reason === "length") truncated = true;
    }

    return { content, truncated };
  }
}
