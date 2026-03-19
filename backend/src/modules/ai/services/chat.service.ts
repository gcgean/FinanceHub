import { prisma } from "../../../lib/prisma";
import { LLMMessage, LLMProvider } from "../providers/llm.interface";
import { OpenAIProvider } from "../providers/openai.provider";
import { AnthropicProvider } from "../providers/anthropic.provider";
import { GeminiProvider } from "../providers/gemini.provider";
import { memoryService } from "./memory.service";
import { insightsService } from "./insights.service";
import { taskService } from "./task.service";
import { env } from "../../../lib/env";

class FallbackProvider implements LLMProvider {
  async generateResponse(messages: LLMMessage[]) {
    const last = messages[messages.length - 1];
    return {
      content: `Estou em modo de fallback porque nenhuma chave de API foi configurada. Sua mensagem foi: ${last?.content ?? ""}`,
      tokensUsed: 0
    };
  }
}

export class ChatService {
  private llmProvider: LLMProvider;
  
  constructor() {
    if (env.OPENAI_API_KEY) {
      this.llmProvider = new OpenAIProvider(env.OPENAI_API_KEY);
    } else if (env.ANTHROPIC_API_KEY) {
      this.llmProvider = new AnthropicProvider(env.ANTHROPIC_API_KEY);
    } else if (env.GEMINI_API_KEY) {
      this.llmProvider = new GeminiProvider(env.GEMINI_API_KEY);
    } else {
      this.llmProvider = new FallbackProvider();
    }
  }

  async createChat(companyId: string, userId: string, title?: string, sectorId?: string) {
    return prisma.aIChat.create({
      data: {
        companyId,
        userId,
        title: title ?? "Nova conversa",
        sectorId: sectorId ?? null,
      },
    });
  }

  async listChats(companyId: string, userId: string) {
    return prisma.aIChat.findMany({
      where: { companyId, userId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { messages: true } },
      },
    });
  }

  async getChat(chatId: string, companyId: string, userId: string) {
    return prisma.aIChat.findFirst({
      where: { id: chatId, companyId, userId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
  }

  async sendMessage(chatId: string, companyId: string, userId: string, content: string) {
    // 1. Verify chat ownership
    const chat = await prisma.aIChat.findFirst({
      where: { id: chatId, companyId, userId },
    });

    if (!chat) throw new Error("Chat not found");

    // 2. Save User Message
    await prisma.aIMessage.create({
      data: {
        chatId,
        role: "user",
        content,
      },
    });

    // 3. Retrieve Context (RAG + Financial Insights)
    const [memories, financialContext] = await Promise.all([
      memoryService.searchMemories(companyId, {
        query: content,
        limit: 3,
      }),
      insightsService.getFinancialContext(companyId),
    ]);

    const contextString = memories.map((m) => `- ${m.content}`).join("\n");

    // 4. Build Prompt with Agentic Capabilities
    const systemPrompt = `Você é um assistente financeiro inteligente do FinanceHub.
    Seu objetivo é ajudar com dúvidas financeiras, análise de dados e operação do sistema.
    
    CAPACIDADES AUTÔNOMAS:
    Se o usuário solicitar uma "análise profunda", "relatório completo" ou "verificação de saúde financeira", você DEVE responder APENAS com o seguinte JSON (sem markdown):
    { "action": "CREATE_TASK", "type": "FINANCIAL_ANALYSIS", "reason": "Solicitação do usuário" }
    
    Se o usuário solicitar "categorizar lançamentos", "arrumar categorias" ou similar, você DEVE responder APENAS com:
    { "action": "CREATE_TASK", "type": "CATEGORIZATION", "reason": "Solicitação do usuário" }

    Contexto Financeiro Atual:
    ${financialContext}
    
    Contexto recuperado da base de conhecimento:
    ${contextString}
    
    Para perguntas normais, responda de forma concisa e profissional.`;

    // 5. Get Chat History
    const history = await prisma.aIMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
      take: 20, // Limit context window
    });

    const messages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
    ];

    // 6. Call LLM
    const response = await this.llmProvider.generateResponse(messages);
    let finalContent = response.content;
    let isTask = false;

    // 7. Check for Action JSON
    try {
        const cleanContent = finalContent.trim().replace(/```json/g, "").replace(/```/g, "");
        if (cleanContent.startsWith("{") && cleanContent.includes("CREATE_TASK")) {
            const action = JSON.parse(cleanContent);
            if (action.action === "CREATE_TASK") {
                const task = await taskService.createTask(companyId, { type: action.type });
                
                // Trigger worker immediately (via queue service inside createTask)
                // taskService.processTask(task.id).catch(console.error);
                
                finalContent = `Entendido. Iniciei uma tarefa de ${action.type === 'CATEGORIZATION' ? 'categorização' : 'análise financeira'} (ID #${task.id.slice(-4)}). Você será notificado assim que o processo for concluído.`;
                isTask = true;
            }
        }
    } catch (e) {
        // Ignore JSON parse errors, assume normal text
    }

    // 8. Save Assistant Message
    const assistantMessage = await prisma.aIMessage.create({
      data: {
        chatId,
        role: "assistant",
        content: finalContent,
        tokensUsed: response.tokensUsed,
      },
    });

    // 9. Update Chat Timestamp
    await prisma.aIChat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return assistantMessage;
  }
}

export const chatService = new ChatService();
