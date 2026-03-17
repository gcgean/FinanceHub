import { AIMemory, AIDocument, Prisma, AITask } from "@prisma/client";

// ... existing interfaces

export interface CreateTaskDTO {
  type: string;
  payload?: any; // JSON payload for task parameters
}

export interface TaskResult {
  summary: string;
  details?: any;
}
