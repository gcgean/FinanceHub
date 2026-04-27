import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { memoryService } from "../services/memory.service.js";
import { CreateMemoryDTO } from "../types.js";
import { resolveCompanyId } from "../../../lib/company.js";

// Schema validation
const createMemorySchema = z.object({
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
  sectorId: z.string().optional(),
  validUntil: z.string().datetime().optional(), // ISO String
  confidence: z.number().min(0).max(1).default(1.0),
});

const updateMemorySchema = z.object({
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  validUntil: z.string().datetime().optional(),
  confidence: z.number().optional(),
});

const searchMemorySchema = z.object({
  query: z.string().optional(),
  sectorId: z.string().optional(),
  tags: z.string().optional(), // Comma separated
  limit: z.coerce.number().min(1).max(100).default(20),
});

export class MemoryController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as { companyId?: string; role?: string };
    const companyId = await resolveCompanyId(request);
    const body = createMemorySchema.parse(request.body);

    const memory = await memoryService.createMemory(companyId, {
      ...body,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
    });

    return reply.status(201).send(memory);
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as { companyId?: string; role?: string };
    const companyId = await resolveCompanyId(request);
    const { id } = request.params as { id: string };
    const body = updateMemorySchema.parse(request.body);

    const memory = await memoryService.updateMemory(id, companyId, {
      ...body,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
    });

    return reply.send(memory);
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as { companyId?: string; role?: string };
    const companyId = await resolveCompanyId(request);
    const { id } = request.params as { id: string };

    await memoryService.deleteMemory(id, companyId);
    return reply.status(204).send();
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as { companyId?: string; role?: string };
    const companyId = await resolveCompanyId(request);
    const { page, limit } = request.query as { page?: number; limit?: number };

    const result = await memoryService.listMemories(companyId, Number(page) || 1, Number(limit) || 20);
    return reply.send(result);
  }

  async search(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as { companyId?: string; role?: string };
    const companyId = await resolveCompanyId(request);
    const query = searchMemorySchema.parse(request.query);

    const result = await memoryService.searchMemories(companyId, {
      query: query.query || "",
      sectorId: query.sectorId,
      tags: query.tags ? query.tags.split(",") : undefined,
      limit: query.limit,
    });

    return reply.send(result);
  }
}

export const memoryController = new MemoryController();
