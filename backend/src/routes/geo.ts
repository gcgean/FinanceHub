import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export async function geoRoutes(app: FastifyInstance) {
  app.get("/states", async (request) => {
    const q = z.object({ search: z.string().optional() }).parse(request.query);
    const where = q.search ? { OR: [{ code: { contains: q.search, mode: "insensitive" as const } }, { name: { contains: q.search, mode: "insensitive" as const } }] } : {};
    return prisma.state.findMany({ where, orderBy: [{ name: "asc" }, { code: "asc" }] });
  });

  app.get("/cities", async (request) => {
    const q = z.object({
      state: z.string().length(2).optional(),
      search: z.string().optional(),
      take: z.coerce.number().int().min(1).max(200).optional().default(50),
      skip: z.coerce.number().int().min(0).optional().default(0),
    }).parse(request.query);
    const where = {
      ...(q.state ? { stateCode: q.state.toUpperCase() } : {}),
      ...(q.search ? { name: { contains: q.search, mode: "insensitive" as const } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.city.findMany({ where, orderBy: { name: "asc" }, take: q.take, skip: q.skip }),
      prisma.city.count({ where }),
    ]);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[geo/cities] state=${q.state ?? "-"} search="${q.search ?? ""}" take=${q.take} skip=${q.skip} total=${total} returned=${items.length}`);
    }
    return { items, total, take: q.take, skip: q.skip };
  });
}
