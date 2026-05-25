import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db.js";
import { cookieName, verifySession } from "./jwt.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[cookieName];
    if (!token) return res.status(401).json({ error: "AUTH_REQUIRED" });

    const payload = verifySession(token);
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
