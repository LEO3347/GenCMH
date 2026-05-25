import { Router } from "express";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { z } from "zod";
import { prisma } from "../db.js";
import { clearSessionCookie, setSessionCookie, signSession } from "../security/jwt.js";
import { requireAuth } from "../security/auth.js";
import { audit } from "../services/audit.service.js";
import { config } from "../config.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  totpCode: z.string().length(6).optional()
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

  if (parsed.data.email === config.ADMIN_BOOTSTRAP_EMAIL && parsed.data.password === config.ADMIN_BOOTSTRAP_PASSWORD) {
    setSessionCookie(res, signSession("bootstrap-admin"));
    return res.json({
      user: {
        id: "bootstrap-admin",
        email: config.ADMIN_BOOTSTRAP_EMAIL,
        fullName: "Administrador GEN",
        role: "super_admin"
      }
    });
  }

  const user = await prisma.adminUser.findUnique({
    where: { email: parsed.data.email },
    include: { role: { include: { permissions: { include: { permission: true } } } } }
  });

  if (!user || user.lockedAt || !user.isActive) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

  const passwordOk = await bcrypt.compare(parsed.data.password, user.passwordHash);
  const totpOk = user.isTotpEnabled
    ? Boolean(user.totpSecretEncrypted && parsed.data.totpCode && authenticator.check(parsed.data.totpCode, user.totpSecretEncrypted))
    : true;

  if (!passwordOk || !totpOk) {
    const failedLoginAttempts = user.failedLoginAttempts + 1;
    await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts,
        lockedAt: failedLoginAttempts >= 3 ? new Date() : null
      }
    });
    return res.status(401).json({ error: failedLoginAttempts >= 3 ? "ACCOUNT_LOCKED" : "INVALID_CREDENTIALS" });
  }

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lastLoginAt: new Date() }
  });
  req.user = user;
  await audit(req, { action: "login", resource: "auth", resourceId: user.id, after: { email: user.email } });
  setSessionCookie(res, signSession(user.id));
  res.json({ user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role.name } });
});

authRouter.post("/logout", requireAuth, async (req, res) => {
  await audit(req, { action: "logout", resource: "auth", resourceId: req.user?.id });
  clearSessionCookie(res);
  res.status(204).send();
});

authRouter.get("/me", requireAuth, (req, res) => {
  const permissions = req.user?.role.permissions.map(({ permission }) => `${permission.resource}:${permission.action}`) ?? [];
  res.json({
    user: {
      id: req.user?.id,
      email: req.user?.email,
      fullName: req.user?.fullName,
      role: req.user?.role.name,
      departmentId: req.user?.departmentId,
      permissions
    }
  });
});

authRouter.post("/2fa/setup", requireAuth, async (req, res) => {
  const secret = authenticator.generateSecret();
  await prisma.adminUser.update({ where: { id: req.user!.id }, data: { totpSecretEncrypted: secret, isTotpEnabled: false } });
  res.json({ secret, otpauth: authenticator.keyuri(req.user!.email, "Admin FinOps", secret) });
});

authRouter.post("/2fa/verify", requireAuth, async (req, res) => {
  const schema = z.object({ totpCode: z.string().length(6) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success || !req.user?.totpSecretEncrypted) return res.status(400).json({ error: "VALIDATION_ERROR" });
  const ok = authenticator.check(parsed.data.totpCode, req.user.totpSecretEncrypted);
  if (!ok) return res.status(400).json({ error: "INVALID_TOTP" });
  await prisma.adminUser.update({ where: { id: req.user.id }, data: { isTotpEnabled: true } });
  res.json({ enabled: true });
});
