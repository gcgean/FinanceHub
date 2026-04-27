import { prisma } from "../../../lib/prisma.js";
import { CreateTaskDTO, TaskResult } from "../types.js";
import { TransactionType } from "@prisma/client";
import { queueService } from "./queue.service.js";

export class TaskService {
  /**
   * Create a new AI Task
   */
  async createTask(companyId: string, dto: CreateTaskDTO) {
    const task = await prisma.aITask.create({
      data: {
        companyId,
        type: dto.type,
        status: "PENDING",
      },
    });

    // Enfileirar a tarefa para processamento assíncrono
    await queueService.addJob("AI_TASK_PROCESSOR", { taskId: task.id });

    return task;
  }

  /**
   * Get pending tasks
   */
  async getPendingTasks() {
    return prisma.aITask.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 10,
    });
  }

  /**
   * List all tasks for a company
   */
  async listTasks(companyId: string) {
    return prisma.aITask.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: string, result?: TaskResult, error?: string) {
    return prisma.aITask.update({
      where: { id: taskId },
      data: {
        status,
        resultSummary: result?.summary,
        error,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Process a single task (Dispatcher)
   * This would typically be called by a worker
   */
  async processTask(taskId: string) {
    const task = await prisma.aITask.findUnique({ where: { id: taskId } });
    if (!task) throw new Error("Task not found");

    if (task.status === "IN_PROGRESS" || task.status === "COMPLETED") {
      return; // Already processed
    }

    await this.updateTaskStatus(taskId, "IN_PROGRESS");

    try {
      let result: TaskResult;

      switch (task.type) {
        case "FINANCIAL_ANALYSIS":
          result = await this.runFinancialAnalysis(task.companyId);
          break;
        case "CATEGORIZATION":
          result = await this.runCategorization(task.companyId);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      await this.updateTaskStatus(taskId, "COMPLETED", result);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await this.updateTaskStatus(taskId, "FAILED", undefined, errorMessage);
      // throw error; // Don't throw to avoid crashing worker loop
    }
  }

  /**
   * Worker Logic: Financial Analysis
   */
  private async runFinancialAnalysis(companyId: string): Promise<TaskResult> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days

    // 1. Fetch Key Data
    const [txs, pendenciesCount, customers] = await Promise.all([
      prisma.transaction.findMany({
        where: { companyId, date: { gte: startDate } },
      }),
      prisma.pendency.count({
        where: { companyId, status: "OVERDUE" },
      }),
      prisma.customer.count({ where: { companyId } }),
    ]);

    // 2. Calculate Metrics
    const revenue = txs
      .filter((t) => t.type === TransactionType.REVENUE)
      .reduce((sum, t) => sum + t.value, 0);
    
    const expenses = txs
      .filter((t) => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + Math.abs(t.value), 0);

    const revenueCount = txs.filter((t) => t.type === TransactionType.REVENUE).length;
    const ticketMedio = revenueCount > 0 ? revenue / revenueCount : 0;
    
    // We don't have amount in pendency table yet based on previous errors, so we just count
    // If we need amount, we need to join with Transaction or update schema
    const overdueAmount = 0; // Placeholder until schema update

    // 3. Generate Insight Text
    const summary = `
    Análise Financeira (Últimos 30 dias):
    - Receita: R$ ${revenue.toFixed(2)}
    - Despesas: R$ ${expenses.toFixed(2)}
    - Resultado: R$ ${(revenue - expenses).toFixed(2)}
    - Ticket Médio: R$ ${ticketMedio.toFixed(2)}
    
    Alertas:
    - ${pendenciesCount} pendências vencidas.
    - Base de Clientes: ${customers} ativos.
    
    Recomendação: ${pendenciesCount > 5 ? "Focar na recuperação de crédito imediata." : "Manter fluxo de caixa positivo."}
    `;

    return {
      summary,
      details: { 
        revenue, 
        expenses, 
        netIncome: revenue - expenses, 
        ticketMedio,
        overdueCount: pendenciesCount,
        overdueAmount 
      },
    };
  }

  private async runCategorization(companyId: string): Promise<TaskResult> {
    // Mock implementation for categorization task
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      summary: "Categorização automática concluída. 15 transações processadas.",
      details: { processed: 15, updated: 12 }
    };
  }
}

export const taskService = new TaskService();
