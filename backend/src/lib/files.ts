import fs from "fs/promises";
import path from "path";

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export function safeJoin(base: string, ...parts: string[]) {
  const normalizedBase = path.resolve(base);
  const result = path.resolve(base, path.join(...parts));
  if (!result.startsWith(normalizedBase + path.sep) && result !== normalizedBase) {
    throw Object.assign(new Error("INVALID_PATH"), { statusCode: 400 });
  }
  return result;
}

