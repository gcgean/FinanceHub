
import { prisma } from "../../../lib/prisma";
import { JobStatus, BackgroundJob } from "@prisma/client";

type JobHandler = (job: BackgroundJob) => Promise<void>;

export class QueueService {
  private handlers: Map<string, JobHandler> = new Map();
  private isProcessing = false;
  private pollIntervalMs = 5000;

  constructor() {
    // Start polling loop
    this.startWorker();
  }

  /**
   * Registra um handler para uma fila específica.
   */
  registerHandler(queue: string, handler: JobHandler) {
    this.handlers.set(queue, handler);
    console.log(`[QueueService] Handler registrado para fila: ${queue}`);
  }

  /**
   * Adiciona um job na fila.
   */
  async addJob(queue: string, payload: any) {
    const job = await prisma.backgroundJob.create({
      data: {
        queue,
        payload: JSON.stringify(payload),
        status: JobStatus.PENDING,
      },
    });
    console.log(`[QueueService] Job ${job.id} adicionado na fila ${queue}`);
    return job;
  }

  /**
   * Loop principal do worker.
   */
  private async startWorker() {
    console.log("[QueueService] Worker iniciado...");
    setInterval(() => this.processNextJob(), this.pollIntervalMs);
  }

  /**
   * Processa o próximo job pendente.
   */
  private async processNextJob() {
    if (this.isProcessing) return;

    let currentJob: BackgroundJob | null = null;

    try {
      this.isProcessing = true;

      // 1. Encontrar candidato (FIFO, agendado para agora ou antes)
      const candidate = await prisma.backgroundJob.findFirst({
        where: {
          status: JobStatus.PENDING,
          runAt: { lte: new Date() },
        },
        orderBy: { createdAt: "asc" },
      });

      if (!candidate) {
        this.isProcessing = false;
        return;
      }

      // 2. Tentar reservar o job atomicamente (Optimistic Locking)
      // Se outro worker pegar entre o findFirst e o updateMany, count será 0
      const updateResult = await prisma.backgroundJob.updateMany({
        where: {
          id: candidate.id,
          status: JobStatus.PENDING,
        },
        data: {
          status: JobStatus.PROCESSING,
          startedAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      if (updateResult.count === 0) {
        // Job já foi pego por outro processo
        this.isProcessing = false;
        return;
      }

      // 3. Recarregar o job atualizado para ter os dados corretos (attempts, etc)
      const job = await prisma.backgroundJob.findUnique({ where: { id: candidate.id } });
      if (!job) throw new Error("Job desapareceu após reserva");
      
      currentJob = job;

      const handler = this.handlers.get(job.queue);

      if (!handler) {
        throw new Error(`Nenhum handler registrado para a fila ${job.queue}`);
      }

      console.log(`[QueueService] Processando job ${job.id} (${job.queue})... Tentativa ${job.attempts}/${job.maxAttempts}`);
      
      // 4. Executar handler
      await handler(job);

      // 5. Sucesso: Marcar como COMPLETED
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.COMPLETED,
          finishedAt: new Date(),
        },
      });
      
      console.log(`[QueueService] Job ${job.id} concluído com sucesso.`);

    } catch (error: any) {
      console.error(`[QueueService] Erro ao processar job:`, error);
      
      if (currentJob) {
        await this.handleJobFailure(currentJob, error);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Tratamento de falha com Retry e Backoff Exponencial
  async handleJobFailure(job: BackgroundJob, error: any) {
     const errorMessage = error.message || String(error);
     const nextAttempt = job.attempts; // Já foi incrementado no início do processamento
     
     if (nextAttempt < job.maxAttempts) {
       // Retry: Calcular backoff (ex: 1min, 2min, 4min, 8min...)
       const delayMinutes = Math.pow(2, nextAttempt - 1); 
       const nextRunAt = new Date(Date.now() + delayMinutes * 60 * 1000);
       
       console.log(`[QueueService] Job ${job.id} falhou. Reagendando para ${nextRunAt.toISOString()} (Tentativa ${nextAttempt + 1})`);

       await prisma.backgroundJob.update({
         where: { id: job.id },
         data: {
           status: JobStatus.PENDING, // Volta para fila
           lastError: errorMessage,
           runAt: nextRunAt,
         },
       });
     } else {
       // DLQ: Falha definitiva
       console.error(`[QueueService] Job ${job.id} falhou definitivamente após ${job.attempts} tentativas.`);
       
       await prisma.backgroundJob.update({
         where: { id: job.id },
         data: {
           status: JobStatus.FAILED,
           finishedAt: new Date(),
           lastError: errorMessage,
         },
       });
     }
  }
}

export const queueService = new QueueService();
