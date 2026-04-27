import { env } from "./lib/env.js";
import { buildApp } from "./index.js";
import { queueService } from "./modules/ai/services/queue.service.js";
import { taskService } from "./modules/ai/services/task.service.js";

const app = buildApp();

// Iniciar Queue Service Handlers
queueService.registerHandler("AI_TASK_PROCESSOR", async (job) => {
  const { taskId } = JSON.parse(job.payload);
  console.log(`[Worker] Processando tarefa ${taskId}...`);
  await taskService.processTask(taskId);
});

app.listen({ port: env.PORT, host: env.HOST })
  .then((address) => {
    app.log.info({ address }, "server listening");
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });

