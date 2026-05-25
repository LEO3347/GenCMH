import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth } from "../security/auth.js";
import { authorize } from "../security/abac.js";
import { audit } from "../services/audit.service.js";

export const automationRouter = Router();
automationRouter.use(requireAuth);

automationRouter.get("/notifications", async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { OR: [{ userId: req.user!.id }, { userId: null }] },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  res.json({ notifications });
});

automationRouter.post("/exports", authorize("expense", "export"), async (req, res) => {
  const schema = z.object({
    format: z.enum(["XLSX", "CSV", "PDF"]),
    filters: z.record(z.unknown()).default({})
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR" });

  const job = await prisma.exportJob.create({
    data: {
      requestedById: req.user!.id,
      format: parsed.data.format,
      filters: parsed.data.filters as Prisma.InputJsonValue
    }
  });
  await audit(req, { action: "create_export", resource: "export", resourceId: job.id, after: job });
  res.status(202).json({ job });
});

automationRouter.get("/exports/:id", authorize("expense", "export"), async (req, res) => {
  const id = String(req.params.id);
  const job = await prisma.exportJob.findFirst({ where: { id, requestedById: req.user!.id } });
  if (!job) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ job });
});
