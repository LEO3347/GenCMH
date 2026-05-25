import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db.js";
import { cookieName, verifySession } from "./jwt.js";
import type { AuthUser } from "../types.js";

function bootstrapUser(): AuthUser {
  const permissions = ["analytics", "expense", "admin", "camera"].flatMap((resource) =>
    ["create", "read", "update", "delete", "approve", "export"].map((action) => ({
      permission: { id: `${resource}:${action}`, resource, action, description: null },
      roleId: "00000000-0000-0000-0000-000000000000",
      permissionId: `${resource}:${action}`
    }))
  );

  return {
    id: "00000000-0000-0000-0000-000000000001",
    email: "admin@gen.mx",
    passwordHash: "",
    fullName: "Administrador GEN",
    roleId: "00000000-0000-0000-0000-000000000000",
    departmentId: null,
    totpSecretEncrypted: null,
    isTotpEnabled: false,
    failedLoginAttempts: 0,
    lockedAt: null,
    lastLoginAt: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: {
      id: "00000000-0000-0000-0000-000000000000",
      name: "super_admin",
      description: "Acceso inicial de produccion",
      createdAt: new Date(),
      permissions
    }
  } as AuthUser;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[cookieName];
    if (!token) return res.status(401).json({ error: "AUTH_REQUIRED" });

    const payload = verifySession(token);
    if (payload.sub === "bootstrap-admin") {
      req.user = bootstrapUser();
      return next();
    }

    const user = await prisma.adminUser.findUnique({
      where: { id: payload.sub },
      include: { role: { include: { permissions: { include: { permission: true } } } } }
    });

    if (!user || !user.isActive || user.lockedAt) return res.status(401).json({ error: "AUTH_INVALID" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "AUTH_INVALID" });
  }
}
