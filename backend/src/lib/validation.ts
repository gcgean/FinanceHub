import { z } from "zod";

export function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  return schema.parse(body);
}

export function parseQuery<T extends z.ZodTypeAny>(schema: T, query: unknown): z.infer<T> {
  return schema.parse(query);
}

