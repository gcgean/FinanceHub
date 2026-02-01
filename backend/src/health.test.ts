import { beforeAll, afterAll, expect, it } from "vitest";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test_secret_1234567890";

let app: any;

beforeAll(async () => {
  const mod = await import("./index");
  app = mod.buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

it("GET /health", async () => {
  const res = await app.inject({ method: "GET", url: "/health" });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toEqual({ ok: true });
});

