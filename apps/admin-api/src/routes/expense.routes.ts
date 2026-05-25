import { Router } from "express";
import multer from "multer";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth } from "../security/auth.js";
import { authorize } from "../security/abac.js";
import { audit } from "../services/audit.service.js";
import { uploadReceipt } from "../services/storage.service.js";
import { expenseCreateSchema, expenseFiltersSchema, expenseUpdateSchema } from "../validation/expense.schema.js";

export const expenseRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

expenseRouter.use(requireAuth);

expenseRouter.get("/", authorize("expense", "read"), async (req, res) => {
  const parsed = expenseFiltersSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

  const filters = parsed.data;
  const where: Prisma.ExpenseWhereInput = {
    isDeleted: false,
    issuedAt: { gte: filters.from, lte: filters.to },
    departmentId: filters.departmentId as string | undefined,
    vendorId: filters.vendorId as string | undefined,
    paymentStatus: filters.paymentStatus as Prisma.EnumPaymentStatusFilter | undefined,
    currency: filters.currency?.toUpperCase(),
    amount: { gte: filters.minAmount, lte: filters.maxAmount }
  };

  const expenses = await prisma.expense.findMany({
    where,
    include: { vendor: true, category: { include: { parent: true } }, department: true, receipts: true },
    orderBy: { issuedAt: "desc" },
    take: 200
  });
  res.json({ expenses });
});

expenseRouter.post("/", authorize("expense", "create"), async (req, res) => {
  const parsed = expenseCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

  const expense = await prisma.expense.create({
    data: {
      ...parsed.data,
      amount: new Prisma.Decimal(parsed.data.amount),
      exchangeRateToBase: new Prisma.Decimal(parsed.data.exchangeRateToBase),
      createdById: req.user!.id
    },
    include: { vendor: true, category: true, department: true }
  });
  await audit(req, { action: "create", resource: "expense", resourceId: expense.id, after: expense });
  res.status(201).json({ expense });
});

expenseRouter.get("/:id", authorize("expense", "read"), async (req, res) => {
  const id = String(req.params.id);
  const expense = await prisma.expense.findFirst({
    where: { id, isDeleted: false },
    include: { vendor: true, category: { include: { parent: true } }, department: true, receipts: true }
  });
  if (!expense) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ expense });
});

expenseRouter.patch("/:id", authorize("expense", "update"), async (req, res) => {
  const id = String(req.params.id);
  const before = await prisma.expense.findFirst({ where: { id, isDeleted: false } });
  if (!before) return res.status(404).json({ error: "NOT_FOUND" });

  const parsed = expenseUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

  const after = await prisma.expense.update({
    where: { id },
    data: {
      ...parsed.data,
      amount: parsed.data.amount ? new Prisma.Decimal(parsed.data.amount) : undefined,
      exchangeRateToBase: parsed.data.exchangeRateToBase ? new Prisma.Decimal(parsed.data.exchangeRateToBase) : undefined
    }
  });
  await audit(req, { action: "update", resource: "expense", resourceId: after.id, before, after });
  res.json({ expense: after });
});

expenseRouter.delete("/:id", authorize("expense", "delete"), async (req, res) => {
  const id = String(req.params.id);
  const before = await prisma.expense.findFirst({ where: { id, isDeleted: false } });
  if (!before) return res.status(404).json({ error: "NOT_FOUND" });
  const after = await prisma.expense.update({ where: { id }, data: { isDeleted: true } });
  await audit(req, { action: "delete", resource: "expense", resourceId: after.id, before, after });
  res.status(204).send();
});

expenseRouter.post("/:id/receipts", authorize("expense", "update"), upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "FILE_REQUIRED" });
  const id = String(req.params.id);
  const expense = await prisma.expense.findFirst({ where: { id, isDeleted: false } });
  if (!expense) return res.status(404).json({ error: "NOT_FOUND" });

  const uploaded = await uploadReceipt(req.file, expense.id);
  const receipt = await prisma.receiptFile.create({
    data: {
      expenseId: expense.id,
      storageKey: uploaded.key,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      sha256: uploaded.sha256,
      uploadedBy: req.user!.id
    }
  });
  await audit(req, { action: "upload_receipt", resource: "expense", resourceId: expense.id, after: receipt });
  res.status(201).json({ receipt });
});

expenseRouter.post("/batch/status", authorize("expense", "approve"), async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  const paymentStatus = req.body.paymentStatus;
  if (!ids.length || !["PENDING", "PAID", "SCHEDULED", "OVERDUE", "IN_REVIEW"].includes(paymentStatus)) {
    return res.status(400).json({ error: "VALIDATION_ERROR" });
  }
  const before = await prisma.expense.findMany({ where: { id: { in: ids } } });
  const result = await prisma.expense.updateMany({ where: { id: { in: ids } }, data: { paymentStatus } });
  await audit(req, { action: "batch_status", resource: "expense", after: { ids, paymentStatus, count: result.count }, before });
  res.json({ updated: result.count });
});
