import cron from "node-cron";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

export function startRecurringExpenseJob() {
  cron.schedule("*/10 * * * *", async () => {
    try {
      const now = new Date();
      const rules = await prisma.recurringExpenseRule.findMany({
        where: { isActive: true, nextRunAt: { lte: now } }
      });

      for (const rule of rules) {
        await prisma.expense.create({
          data: {
            amount: rule.amount,
            currency: rule.currency,
            exchangeRateToBase: new Prisma.Decimal(1),
            issuedAt: now,
            dueAt: now,
            paymentMethodType: "BANK_TRANSFER",
            paymentStatus: "SCHEDULED",
            vendorId: rule.vendorId,
            categoryId: rule.categoryId,
            departmentId: rule.departmentId,
            createdById: rule.createdById,
            recurringRuleId: rule.id,
            description: `Gasto recurrente: ${rule.name}`
          }
        });

        const nextRunAt = new Date(rule.nextRunAt);
        nextRunAt.setMonth(nextRunAt.getMonth() + 1);
        await prisma.recurringExpenseRule.update({
          where: { id: rule.id },
          data: { lastRunAt: now, nextRunAt }
        });
      }
    } catch (error) {
      console.warn("Recurring expense job skipped", error);
    }
  });
}
