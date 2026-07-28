export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMResponse {
  content: string;
  tokensUsed?: number;
}

export interface LLMProvider {
  generateResponse(messages: LLMMessage[], model?: string): Promise<LLMResponse>;
  /**
   * Streaming opcional: emite pedaços de texto via `onChunk` conforme chegam.
   * Usado por relatórios longos (ex.: análise de suporte) para evitar que uma
   * única chamada bloqueante estoure o timeout do proxy/túnel (~100s) — os bytes
   * continuam fluindo em vez de a conexão ficar parada esperando o texto inteiro.
   * Providers que não implementam caem no fallback do chamador (generateResponse
   * normal, emitindo o conteúdo inteiro como um único chunk).
   */
  generateResponseStream?(
    messages: LLMMessage[],
    onChunk: (delta: string) => void,
    model?: string
  ): Promise<LLMResponse>;
}
