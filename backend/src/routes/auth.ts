import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { parseBody } from "../lib/validation";
import { requireAuth, requireRole } from "../lib/auth";
import { UserRole } from "@prisma/client";

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RegisterBody = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole).optional().default(UserRole.OPERATOR),
  companyId: z.string().optional().nullable(),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/login", async (request) => {
    const { email, password } = parseBody(LoginBody, request.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw Object.assign(new Error("INVALID_CREDENTIALS"), { statusCode: 401 });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw Object.assign(new Error("INVALID_CREDENTIALS"), { statusCode: 401 });

    const token = await app.jwt.sign({
      sub: user.id,
      role: user.role,
      companyId: user.companyId,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
      },
    };
  });

  app.get("/me", { preHandler: [requireAuth(app)] }, async (request) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.sub } });
    if (!user) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
    };
  });

  app.post(
    "/register",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN])] },
    async (request) => {
      const { email, name, password, role, companyId } = parseBody(RegisterBody, request.body);
      const passwordHash = await bcrypt.hash(password, 10);

      const created = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          role,
          companyId: companyId ?? null,
        },
      });

      return {
        id: created.id,
        email: created.email,
        name: created.name,
        role: created.role,
        companyId: created.companyId,
      };
    }
  );
}

