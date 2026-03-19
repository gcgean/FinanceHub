import { prisma } from "../../../lib/prisma";
import { CreateMemoryDTO, SearchMemoryParams, UpdateMemoryDTO } from "../types";
import { Prisma } from "@prisma/client";

export class MemoryService {
  /**
   * Create a new memory entry
   */
  async createMemory(companyId: string, data: CreateMemoryDTO) {
    return prisma.aIMemory.create({
      data: {
        companyId,
        content: data.content,
        tags: data.tags,
        sectorId: data.sectorId,
        validUntil: data.validUntil,
        confidence: data.confidence ?? 1.0,
      },
    });
  }

  /**
   * Update an existing memory
   */
  async updateMemory(memoryId: string, companyId: string, data: UpdateMemoryDTO) {
    return prisma.aIMemory.update({
      where: { id: memoryId, companyId },
      data: {
        content: data.content,
        tags: data.tags,
        validUntil: data.validUntil,
        confidence: data.confidence,
      },
    });
  }

  /**
   * Delete a memory
   */
  async deleteMemory(memoryId: string, companyId: string) {
    return prisma.aIMemory.delete({
      where: { id: memoryId, companyId },
    });
  }

  /**
   * Search memories with Keyword Relevance Ranking (Simulated Hybrid Search)
   */
  async searchMemories(companyId: string, params: SearchMemoryParams) {
    const { query, sectorId, tags, limit = 5 } = params;

    const whereClause: Prisma.AIMemoryWhereInput = {
      companyId,
    };

    if (sectorId) {
      whereClause.sectorId = sectorId;
    }

    if (tags && tags.length > 0) {
      whereClause.tags = {
        hasSome: tags,
      };
    }

    // 1. Broad Search (Filter by keywords)
    if (query) {
      // Split query into keywords for broader matching
      const keywords = query.split(" ").filter((k: string) => k.length > 3);
      if (keywords.length > 0) {
        whereClause.OR = [
          { content: { contains: query, mode: "insensitive" as const } }, // Exact phrase
          ...keywords.map((k: string) => ({ content: { contains: k, mode: "insensitive" as const } })), // Keywords
        ];
      } else {
        whereClause.content = { contains: query, mode: "insensitive" as const };
      }
    }

    const candidates = await prisma.aIMemory.findMany({
      where: whereClause,
      take: limit * 3, // Fetch more to re-rank
      orderBy: { createdAt: "desc" },
      include: { sector: true },
    });

    // 2. In-Memory Re-ranking (Simple Scoring)
    const scored = candidates.map((mem) => {
      let score = 0;
      const contentLower = mem.content.toLowerCase();
      const queryLower = query.toLowerCase();

      // Exact match bonus
      if (contentLower.includes(queryLower)) score += 10;

      // Keyword match bonus
      const keywords = queryLower.split(" ");
      keywords.forEach((k: string) => {
        if (contentLower.includes(k)) score += 1;
      });

      // Recency bonus (decay over 30 days)
      const daysOld = (Date.now() - mem.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysOld < 30) score += (30 - daysOld) * 0.1;

      // Confidence weight
      score *= mem.confidence;

      return { ...mem, score };
    });

    // Sort by score
    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Get all memories for a company
   */
  async listMemories(companyId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const [total, items] = await Promise.all([
      prisma.aIMemory.count({ where: { companyId } }),
      prisma.aIMemory.findMany({
        where: { companyId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { sector: true },
      }),
    ]);

    return {
      total,
      pages: Math.ceil(total / limit),
      items,
    };
  }
}

export const memoryService = new MemoryService();
