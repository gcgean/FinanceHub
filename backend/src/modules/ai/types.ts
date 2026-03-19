import { AITask } from "@prisma/client";

export interface CreateTaskDTO {
  type: string;
  payload?: Record<string, unknown>;
}

export interface TaskResult {
  summary: string;
  details?: Record<string, unknown>;
}

export interface CreateMemoryDTO {
  content: string;
  tags?: string[];
  sectorId?: string;
  validUntil?: Date;
  confidence?: number;
}

export interface UpdateMemoryDTO {
  content?: string;
  tags?: string[];
  validUntil?: Date;
  confidence?: number;
}

export interface SearchMemoryParams {
  query: string;
  sectorId?: string;
  tags?: string[];
  limit?: number;
}
