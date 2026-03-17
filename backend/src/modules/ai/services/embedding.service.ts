import OpenAI from "openai";
import { env } from "../../../lib/env";

export class EmbeddingService {
  private openai: OpenAI | null = null;

  constructor() {
    if (env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    if (this.openai) {
      try {
        const response = await this.openai.embeddings.create({
          model: "text-embedding-3-small",
          input: text,
        });
        return response.data[0].embedding;
      } catch (error) {
        console.error("[EmbeddingService] Error generating embedding:", error);
        // Fallback to mock if API fails
      }
    }

    console.warn("[EmbeddingService] Mocking embedding generation (1536 dimensions) - API Key missing or error");
    return new Array(1536).fill(0).map(() => Math.random());
  }
}

export const embeddingService = new EmbeddingService();
