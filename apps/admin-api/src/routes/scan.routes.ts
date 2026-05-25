import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../security/auth.js";
import { hashToken, verifyGenQr } from "../services/genQr.js";

export const scanRouter = Router();

const scanSchema = z.object({
  token: z.string().min(40),
  deviceId: z.string().min(3).default("admin-camera")
});

scanRouter.use(requireAuth);

scanRouter.post("/validate", async (req, res) => {
  const parsed = scanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ valid: false, reason: "VALIDATION_ERROR" });

  let payload;
  try {
    payload = verifyGenQr(parsed.data.token);
  } catch (error) {
    return res.status(400).json({ valid: false, reason: error instanceof Error ? error.message : "invalid_qr" });
  }

  const tokenHash = hashToken(parsed.data.token);
  const result = await prisma.$transaction(async (db) => {
    const rows = await db.$queryRawUnsafe<Array<{
      qr_id: string;
      qr_status: string;
      ticket_status: string;
      attendee_name: string;
      buyer: string;
      event_title: string;
      tier: string;
    }>>(
      `select
         q.id as qr_id,
         q.status as qr_status,
         t.status as ticket_status,
         t.attendee_name,
         u.display_name as buyer,
         e.title as event_title,
         tt.name as tier
       from qr_codes q
       join tickets t on t.id = q.ticket_id
       join users u on u.id = t.user_id
       join events e on e.id = t.event_id
       join ticket_types tt on tt.id = t.ticket_type_id
       where q.ticket_id = $1 and q.token_hash = $2
       for update`,
      payload.ticketId,
      tokenHash
    );

    const ticket = rows[0];
    if (!ticket || ticket.qr_status !== "active" || ticket.ticket_status === "used") {
      return { valid: false, reason: "duplicate_or_invalid_scan", ticket };
    }

    await db.$executeRawUnsafe("update qr_codes set status = 'used', used_at = now() where id = $1", ticket.qr_id);
    await db.$executeRawUnsafe("update tickets set status = 'used', checked_in_at = now() where id = $1", payload.ticketId);
    return { valid: true, ticket };
  });

  res.json({
    valid: result.valid,
    reason: result.reason,
    attendee: result.ticket
      ? {
          name: result.ticket.attendee_name,
          buyer: result.ticket.buyer,
          event: result.ticket.event_title,
          tier: result.ticket.tier
        }
      : null
  });
});
