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
}
