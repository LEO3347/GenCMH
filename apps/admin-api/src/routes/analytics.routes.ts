import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth } from "../security/auth.js";
import { authorize } from "../security/abac.js";

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { now, start, end };
}

analyticsRouter.get("/kpis", authorize("analytics", "read"), async (_req, res) => {
  const { now, start, end } = monthRange();
  const expenses = await prisma.expense.findMany({
    where: { isDeleted: false, issuedAt: { gte: start, lte: end } },
    select: { amount: true, exchangeRateToBase: true, departmentId: true }
  });
  const total = expenses.reduce((sum, e) => sum.plus(e.amount.mul(e.exchangeRateToBase)), new Prisma.Decimal(0));
  const daysElapsed = Math.max(1, now.getDate());
  const burnRate = total.div(daysElapsed);
  const projection = burnRate.mul(end.getDate());
  const budgets = await prisma.budget.findMany({ where: { periodStart: { lte: now }, periodEnd: { gte: now } } });
  const budgetTotal = budgets.reduce((sum, b) => sum.plus(b.amount), new Prisma.Decimal(0));
  const budgetDeviation = budgetTotal.gt(0) ? total.minus(budgetTotal).div(budgetTotal).mul(100) : new Prisma.Decimal(0);

  res.json({
    totalMonth: total.toNumber(),
    burnRate: burnRate.toNumber(),
    budgetDeviation: budgetDeviation.toNumber(),
    monthEndProjection: projection.toNumber()
  });
});

analyticsRouter.get("/spend-by-department", authorize("analytics", "read"), async (_req, res) => {
  const rows = await prisma.$queryRaw<{ month: Date; department: string; total: Prisma.Decimal }[]>`
    SELECT date_trunc('month', e."issuedAt") AS month, d.name AS department,
           SUM(e.amount * e."exchangeRateToBase") AS total
    FROM "Expense" e
    JOIN "Department" d ON d.id = e."departmentId"
    WHERE e."isDeleted" = false
    GROUP BY 1, 2
    ORDER BY 1 ASC
  `;
  res.json({ series: rows.map((r) => ({ month: r.month, department: r.department, total: Number(r.total) })) });
});

analyticsRouter.get("/spend-concentration", authorize("analytics", "read"), async (_req, res) => {
  const rows = await prisma.expense.groupBy({
    by: ["vendorId"],
    where: { isDeleted: false },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 20
  });
  const vendors = await prisma.vendor.findMany({ where: { id: { in: rows.map((r) => r.vendorId) } } });
  res.json({
    items: rows.map((r) => ({
      vendorId: r.vendorId,
      vendor: vendors.find((v) => v.id === r.vendorId)?.legalName ?? "N/D",
      total: Number(r._sum.amount ?? 0)
    }))
  });
});
