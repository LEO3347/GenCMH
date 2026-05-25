import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db.js";

type Action = "create" | "read" | "update" | "delete" | "approve" | "export";

function hasPermission(req: Request, resource: string, action: Action) {
  return req.user?.role.permissions.some(({ permission }) => {
    return permission.resource === resource && permission.action === action;
  });
}

function conditionsMatch(conditions: unknown, req: Request) {
  if (!conditions || typeof conditions !== "object") return true;
  const c = conditions as Record<string, unknown>;
  if (c.sameDepartment === true && req.body.departmentId && req.user?.departmentId !== req.body.departmentId) return false;
  if (typeof c.maxAmount === "number" && Number(req.body.amount ?? 0) > c.maxAmount) return false;
  return true;
}

export function authorize(resource: string, action: Action) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "AUTH_REQUIRED" });
    if (!hasPermission(req, resource, action)) return res.status(403).json({ error: "PERMISSION_DENIED" });

    const policies = await prisma.policy.findMany({
      where: { resource, action, isActive: true },
      orderBy: { priority: "asc" }
    });

    const denied = policies.some((policy) => policy.effect === "deny" && conditionsMatch(policy.conditions, req));
    if (denied) return res.status(403).json({ error: "ABAC_DENIED" });

    const allows = policies.filter((policy) => policy.effect === "allow");
    if (allows.length && !allows.some((policy) => conditionsMatch(policy.conditions, req))) {
      return res.status(403).json({ error: "ABAC_NO_MATCH" });
    }

    next();
  };
}
