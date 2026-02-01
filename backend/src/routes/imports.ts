import type { FastifyInstance } from "fastify";
import { z } from "zod";
import path from "path";
import fs from "fs/promises";
import { nanoid } from "nanoid";
import { fileURLToPath } from "url";
import { prisma } from "../lib/prisma";
import { parseBody, parseQuery } from "../lib/validation";
import { ensureDir, safeJoin } from "../lib/files";
import { requireAuth, requireCompanyScope, requireRole } from "../lib/auth";
import { ImportSource, ImportStatus, Prisma, UserRole } from "@prisma/client";

type MultipartFile = { filename: string; mimetype: string; toBuffer: () => Promise<Buffer> }

const ListQuery = z.object({
  take: z.coerce.number().int().min(1).max(200).optional().default(50),
  skip: z.coerce.number().int().min(0).optional().default(0),
  status: z.nativeEnum(ImportStatus).optional(),
});

const ApiBody = z.object({
  provider: z.string().min(1),
  credentialsRef: z.string().min(1),
});

const AdminCompanyQuery = z.object({
  companyId: z.string().optional(),
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function saveUploadedFile(companyId: string, file: MultipartFile) {
  const uploadsBase = path.resolve(__dirname, "..", "..", "uploads");
  const companyDir = safeJoin(uploadsBase, companyId);
  await ensureDir(companyDir);

  const ext = path.extname(file.filename ?? "") || "";
  const name = `${Date.now()}_${nanoid(10)}${ext}`;
  const fullPath = safeJoin(companyDir, name);

  const buffer = await file.toBuffer();
  await fs.writeFile(fullPath, buffer);
  return {
    filename: file.filename as string,
    mimeType: file.mimetype as string,
    path: `/uploads/${companyId}/${name}`,
  };
}

export async function importsRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [requireAuth(app), requireCompanyScope()] },
    async (request) => {
      const { take, skip, status } = parseQuery(ListQuery, request.query);
      const companyId = request.user.role === UserRole.ADMIN ? undefined : request.user.companyId!;
      const where: Prisma.ImportJobWhereInput = {
        ...(companyId ? { companyId } : {}),
        ...(status ? { status } : {}),
      };
      const [items, total] = await Promise.all([
        prisma.importJob.findMany({ where, take, skip, orderBy: { createdAt: "desc" } }),
        prisma.importJob.count({ where }),
      ]);
      return { items, total, take, skip };
    }
  );

  app.post(
    "/excel",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const { companyId: companyIdFromQuery } = parseQuery(AdminCompanyQuery, request.query);
      const companyId = request.user.role === UserRole.ADMIN ? (companyIdFromQuery ?? request.user.companyId) : request.user.companyId;
      if (!companyId) throw Object.assign(new Error("COMPANY_REQUIRED"), { statusCode: 400 });
      const file = await (request as unknown as { file: () => Promise<MultipartFile | undefined> }).file();
      if (!file) throw Object.assign(new Error("FILE_REQUIRED"), { statusCode: 400 });
      const saved = await saveUploadedFile(companyId, file);

      return prisma.importJob.create({
        data: {
          companyId,
          source: ImportSource.EXCEL,
          status: ImportStatus.QUEUED,
          filename: saved.filename,
          mimeType: saved.mimeType,
          path: saved.path,
        },
      });
    }
  );

  app.post(
    "/receipts",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const { companyId: companyIdFromQuery } = parseQuery(AdminCompanyQuery, request.query);
      const companyId = request.user.role === UserRole.ADMIN ? (companyIdFromQuery ?? request.user.companyId) : request.user.companyId;
      if (!companyId) throw Object.assign(new Error("COMPANY_REQUIRED"), { statusCode: 400 });
      const file = await (request as unknown as { file: () => Promise<MultipartFile | undefined> }).file();
      if (!file) throw Object.assign(new Error("FILE_REQUIRED"), { statusCode: 400 });
      const saved = await saveUploadedFile(companyId, file);

      return prisma.importJob.create({
        data: {
          companyId,
          source: ImportSource.RECEIPT,
          status: ImportStatus.QUEUED,
          filename: saved.filename,
          mimeType: saved.mimeType,
          path: saved.path,
        },
      });
    }
  );

  app.post(
    "/api",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN, UserRole.OPERATOR]), requireCompanyScope()] },
    async (request) => {
      const { companyId: companyIdFromQuery } = parseQuery(AdminCompanyQuery, request.query);
      const companyId = request.user.role === UserRole.ADMIN ? (companyIdFromQuery ?? request.user.companyId) : request.user.companyId;
      if (!companyId) throw Object.assign(new Error("COMPANY_REQUIRED"), { statusCode: 400 });
      const { provider, credentialsRef } = parseBody(ApiBody, request.body);
      return prisma.importJob.create({
        data: {
          companyId,
          source: ImportSource.API,
          status: ImportStatus.QUEUED,
          resultJson: JSON.stringify({ provider, credentialsRef }),
        },
      });
    }
  );
}
