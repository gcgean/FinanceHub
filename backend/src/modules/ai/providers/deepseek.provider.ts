import OpenAI from "openai";
import { LLMMessage, LLMProvider, LLMResponse } from "./llm.interface.js";
import { env } from "../../../lib/env.js";

/**
 * DeepSeek expõe uma API compatível com a da OpenAI, então reaproveitamos o
 * mesmo SDK apenas trocando a baseURL — sem dependência nova.
 */
/**
 * Orcamento de saida por modelo.
 * No deepseek-reasoner a cadeia de raciocinio conta DENTRO de completion_tokens
 * (usage.completion_tokens_details.reasoning_tokens), entao um teto baixo faz o
 * limite estourar durante o raciocinio e a resposta final voltar VAZIA. Ele
 * aceita ate 65536, entao damos folga real. O deepseek-chat nao raciocina e
 * usa todo o orcamento na resposta.
 */
function maxTokensPara(model: string): number {
  return model.includes("reasoner") ? 64000 : 8192;
}

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
    const modelo = model || this.defaultModel;
    const response = await this.client.chat.completions.create({
      model: modelo,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: maxTokensPara(modelo),
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
    const modelo = model || this.defaultModel;
    const stream = await this.client.chat.completions.create({
      model: modelo,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: maxTokensPara(modelo),
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
