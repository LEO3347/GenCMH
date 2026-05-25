import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../security/auth.js";

export const adminUsersRouter = Router();

const adminSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8)
});

adminUsersRouter.use(requireAuth);

adminUsersRouter.get("/", async (_req, res) => {
  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: "desc" },
    include: { role: true },
    take: 100
  });
  res.json({
    admins: users.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role.name,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt
    }))
  });
});

adminUsersRouter.post("/", async (req, res) => {
  const parsed = adminSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

  const role = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: { name: "admin", description: "Administrador GEN" }
  });
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.adminUser.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      fullName: parsed.data.fullName,
      passwordHash,
      roleId: role.id,
      isTotpEnabled: false
    },
    include: { role: true }
  });

  res.status(201).json({
    admin: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role.name,
      isActive: user.isActive
    }
  });
});
