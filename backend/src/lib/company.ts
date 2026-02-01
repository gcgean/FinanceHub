import type { FastifyRequest } from "fastify";
import { UserRole } from "@prisma/client";
import { prisma } from "./prisma";

export async function resolveCompanyId(request: FastifyRequest): Promise<string> {
  const headerCompanyId = String(request.headers["x-company-id"] ?? "").trim();
  const companyId = request.user.role === UserRole.ADMIN ? (headerCompanyId || request.user.companyId || "") : request.user.companyId || "";
  if (!companyId) throw Object.assign(new Error("COMPANY_REQUIRED"), { statusCode: 400 });

  const exists = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
  if (!exists) throw Object.assign(new Error("COMPANY_NOT_FOUND"), { statusCode: 404 });
  return companyId;
}

