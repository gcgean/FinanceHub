import { UserRole } from "@prisma/client";
import type { FastifyInstance, FastifyRequest } from "fastify";

export type AuthUser = {
  sub: string;
  role: UserRole;
  companyId: string | null;
};

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}

export function requireAuth(app: FastifyInstance) {
  return async (request: FastifyRequest) => {
    await request.jwtVerify();
  };
}

export function requireRole(roles: UserRole[]) {
  return async (request: FastifyRequest) => {
    if (!roles.includes(request.user.role)) {
      throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
    }
  };
}

export function requireCompanyScope() {
  return async (request: FastifyRequest) => {
    if (!request.user.companyId && request.user.role !== UserRole.ADMIN) {
      throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
    }
  };
}
