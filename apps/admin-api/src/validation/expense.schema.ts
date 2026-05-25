import { z } from "zod";

export const expenseBaseSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,4})?$/),
  currency: z.string().length(3).transform((v) => v.toUpperCase()),
  exchangeRateToBase: z.string().regex(/^\d+(\.\d{1,8})?$/),
  issuedAt: z.coerce.date(),
  paidAt: z.coerce.date().optional(),
  dueAt: z.coerce.date(),
  paymentMethodType: z.enum(["CORPORATE_CARD", "BANK_TRANSFER", "PETTY_CASH"]),
  cardLast4: z.string().regex(/^\d{4}$/).optional(),
  transferTrackingKey: z.string().min(6).max(80).optional(),
  pettyCashCustodian: z.string().max(120).optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "SCHEDULED", "OVERDUE", "IN_REVIEW"]).default("PENDING"),
  vendorId: z.string().uuid(),
  categoryId: z.string().uuid(),
  departmentId: z.string().uuid(),
  description: z.string().max(500).optional()
});

export const expenseCreateSchema = expenseBaseSchema.superRefine((data, ctx) => {
  if (data.paymentMethodType === "CORPORATE_CARD" && !data.cardLast4) {
    ctx.addIssue({ code: "custom", path: ["cardLast4"], message: "Required for corporate card" });
  }
  if (data.paymentMethodType === "BANK_TRANSFER" && !data.transferTrackingKey) {
    ctx.addIssue({ code: "custom", path: ["transferTrackingKey"], message: "Required for transfer" });
  }
});

export const expenseUpdateSchema = expenseBaseSchema.partial();

export const expenseFiltersSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  departmentId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "SCHEDULED", "OVERDUE", "IN_REVIEW"]).optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  currency: z.string().length(3).optional()
});
