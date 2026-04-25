import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { parseBody } from "../lib/validation";
import { requireAuth, requireRole } from "../lib/auth";
import { UserRole } from "@prisma/client";

// Simple in-memory rate limiter for login attempts
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_MAX_ATTEMPTS = 15;

const LoginBody = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

const RegisterBody = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(255),
  password: z.string().min(8).max(128),
  role: z.nativeEnum(UserRole).optional().default(UserRole.OPERATOR),
  companyId: z.string().max(100).optional().nullable(),
});

type LoginRequest = FastifyRequest<{ Body: z.infer<typeof LoginBody> }>;

export async function authRoutes(app: FastifyInstance) {
  app.post("/login", async (request: LoginRequest) => {
    // Rate limiting by IP
    const ip = request.ip ?? "unknown";
    const now = Date.now();
    const attempt = loginAttempts.get(ip);
    if (attempt && attempt.resetAt > now) {
      if (attempt.count >= LOGIN_MAX_ATTEMPTS) {
        throw Object.assign(new Error("TOO_MANY_REQUESTS"), { statusCode: 429 });
      }
      attempt.count++;
    } else {
      loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    }

    const parsed = LoginBody.safeParse(request.body);
    if (!parsed.success) {
      throw Object.assign(new Error("INVALID_PAYLOAD"), { statusCode: 400 });
    }
    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { accessGroup: { select: { permissions: true } } },
    });
    if (!user) throw Object.assign(new Error("INVALID_CREDENTIALS"), { statusCode: 401 });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw Object.assign(new Error("INVALID_CREDENTIALS"), { statusCode: 401 });

    // Clear rate limit on successful login
    loginAttempts.delete(ip);

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const permissions = user.accessGroup?.permissions ?? [];

    const token = await app.jwt.sign({
      sub: user.id,
      role: user.role,
      companyId: user.companyId,
      ...(permissions.length > 0 && { permissions }),
    }, { expiresIn: "30d" });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        permissions,
      },
    };
  });

  app.get("/me", { preHandler: [requireAuth(app)] }, async (request: FastifyRequest) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      include: { accessGroup: { select: { id: true, name: true, permissions: true } } },
    });
    if (!user) throw Object.assign(new Error("NOT_FOUND"), { statusCode: 404 });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      accessGroup: user.accessGroup ?? null,
    };
  });

  app.post(
    "/register",
    { preHandler: [requireAuth(app), requireRole([UserRole.ADMIN])] },
    async (request: FastifyRequest) => {
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
