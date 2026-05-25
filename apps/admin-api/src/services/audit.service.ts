import crypto from "node:crypto";
import type { Request } from "express";
import { prisma } from "../db.js";

export async function audit(req: Request, input: {
  action: string;
  resource: string;
  resourceId?: string;
  before?: unknown;
  after?: unknown;
}) {
  const previous = await prisma.auditLog.findFirst({ orderBy: { createdAt: "desc" } });
  const payload = JSON.stringify({
    actorId: req.user?.id ?? null,
    ...input,
    previousHash: previous?.hash ?? null,
    at: new Date().toISOString()
  });

  const hash = crypto.createHash("sha256").update(payload).digest("hex");

  return prisma.auditLog.create({
    data: {
      actorId: req.user?.id,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      before: input.before as never,
      after: input.after as never,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      previousHash: previous?.hash,
      hash
    }
  });
}
