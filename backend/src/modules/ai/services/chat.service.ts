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
  public async getProvider(companyId: string): Promise<LLMProvider> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { aiProvider: true, openaiApiKey: true, anthropicApiKey: true, geminiApiKey: true }
    });

    const providerName = company?.aiProvider || "openai";
    
    // Tenta usar a chave da empresa para o provedor escolhido. Se não tiver, cai pro .env
    if (providerName === "anthropic") {
      const key = company?.anthropicApiKey || env.ANTHROPIC_API_KEY;
      if (key) return new AnthropicProvider(key);
    } else if (providerName === "gemini") {
      const key = company?.geminiApiKey || env.GEMINI_API_KEY;
      if (key) return new GeminiProvider(key);
    }
    
    // Default: OpenAI
    const key = company?.openaiApiKey || env.OPENAI_API_KEY;
    if (key) return new OpenAIProvider(key);

    return new FallbackProvider();
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
    const [memories, detailedData] = await Promise.all([
      memoryService.searchMemories(companyId, {
        query: content,
        limit: 3,
      }),
      insightsService.getDetailedCompanyData(companyId),
    ]);

    const contextString = memories.map((m) => `- ${m.content}`).join("\n");

    const empresaNome = detailedData?.nome || "Empresa Desconhecida";

    console.log("=== INJETANDO DADOS NO PROMPT ===");
    console.log("Empresa:", empresaNome);
    console.log(JSON.stringify(detailedData, null, 2));
    console.log("=================================");

    // 4. Build System Prompt
    const systemPrompt = `Você é o Assistente IA do FinanceHub. 
Sua tarefa é analisar os dados financeiros e responder as perguntas APENAS baseadas nos dados fornecidos abaixo.
NUNCA invente dados e NUNCA assuma que está falando de outra empresa. 

NOME DA EMPRESA ATUAL: ${empresaNome}

DADOS FINANCEIROS REAIS DE ${empresaNome}:
${JSON.stringify(detailedData, null, 2)}

Contexto recuperado da base de conhecimento:
${contextString}

REGRAS ESTRITAS:
1. Sempre se refira à empresa pelo nome exato: "${empresaNome}".
2. Se o faturamento for 0, diga que não há faturamento registrado neste mês.
3. Formate valores em R$.
4. Se perguntarem algo fora dos dados acima, diga que não tem essa informação.
`;

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
    const provider = await this.getProvider(companyId);
    const response = await provider.generateResponse(messages);
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
