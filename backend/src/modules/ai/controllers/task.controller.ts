import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { taskService } from "../services/task.service.js";
import { resolveCompanyId } from "../../../lib/company.js";

const CreateTaskSchema = z.object({
  type: z.string().min(1),
  // payload: z.any().optional(), // Future
});

export class TaskController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as { companyId?: string; role?: string };
    const companyId = await resolveCompanyId(request);
    const body = CreateTaskSchema.parse(request.body);

    const task = await taskService.createTask(companyId, body);
    
    // For MVP, we might want to trigger processing immediately or let a worker pick it up.
    taskService.processTask(task.id).catch(err => console.error(`Background task failed: ${err}`));

    return reply.status(201).send(task);
  }

  // Worker trigger
  async runWorker(request: FastifyRequest, reply: FastifyReply) {
    const tasks = await taskService.getPendingTasks();
    const results = [];
    
    for (const task of tasks) {
      try {
        const result = await taskService.processTask(task.id);
        results.push({ id: task.id, status: "COMPLETED", result });
      } catch (error) {
        results.push({ id: task.id, status: "FAILED", error });
      }
    }

    return reply.send({ processed: results.length, details: results });
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as { companyId?: string; role?: string };
    const companyId = await resolveCompanyId(request);
    const tasks = await taskService.listTasks(companyId);
    return reply.send(tasks);
  }
}

export const taskController = new TaskController();
