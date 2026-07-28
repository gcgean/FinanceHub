import Anthropic from "@anthropic-ai/sdk";
import { LLMMessage, LLMProvider, LLMResponse } from "./llm.interface.js";
import { env } from "../../../lib/env.js";

// Relatórios gerais (semanal/mensal) pedem 1 parágrafo por técnico + interpretação
// do dashboard inteiro — com equipes de 15+ técnicos isso passava de 8192 tokens e
// cortava a análise no meio (ex.: parava depois do 4º técnico, sem aviso nenhum).
const MAX_OUTPUT_TOKENS = 16000;

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor(apiKey?: string) {
    const key = apiKey || env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }
    this.client = new Anthropic({ apiKey: key });
  }

  async generateResponse(messages: LLMMessage[], model = "claude-sonnet-5"): Promise<LLMResponse> {
    const systemMessage = messages.find((m) => m.role === "system")?.content;
    const chatMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const response = await this.client.messages.create({
      model,
      system: systemMessage,
      messages: chatMessages,
      max_tokens: MAX_OUTPUT_TOKENS,
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "";

    return {
      content,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      truncated: response.stop_reason === "max_tokens",
    };
  }

  async generateResponseStream(
    messages: LLMMessage[],
    onChunk: (delta: string) => void,
    model = "claude-sonnet-5"
  ): Promise<LLMResponse> {
    const systemMessage = messages.find((m) => m.role === "system")?.content;
    const chatMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const stream = this.client.messages.stream({
      model,
      system: systemMessage,
      messages: chatMessages,
      max_tokens: MAX_OUTPUT_TOKENS,
    });

    stream.on("text", (delta) => onChunk(delta));

    const finalMessage = await stream.finalMessage();
    const content = finalMessage.content[0]?.type === "text" ? finalMessage.content[0].text : "";

    return {
      content,
      tokensUsed: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
      truncated: finalMessage.stop_reason === "max_tokens",
    };
  }
}
