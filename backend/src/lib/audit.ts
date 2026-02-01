import { AuditAction } from "@prisma/client";
import { prisma } from "./prisma";

export async function logAudit(params: {
  companyId: string;
  userId?: string | null;
  entity: string;
  entityId: string;
  action: AuditAction;
  oldJson?: unknown;
  newJson?: unknown;
}) {
  return prisma.auditLog.create({
    data: {
      companyId: params.companyId,
      userId: params.userId ?? null,
      entity: params.entity,
      entityId: params.entityId,
      action: params.action,
      oldJson: params.oldJson === undefined ? null : JSON.stringify(params.oldJson),
      newJson: params.newJson === undefined ? null : JSON.stringify(params.newJson),
    },
  });
}

