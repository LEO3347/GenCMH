import { Router } from "express";
import { z } from "zod";
import { pool, tx } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getTicketRecoveryBundle, regenerateTicketQr } from "../services/ticketRecovery.js";
import { emitEvent, emitUser } from "../services/realtime.js";

export const adminTicketsRouter = Router();

adminTicketsRouter.use(requireAuth, requireRole("admin", "super_admin", "organizer"));

const searchSchema = z.object({
  q: z.string().min(2).max(120)
});

async function audit(adminUserId: string, ticketId: string | null, userId: string | null, actionType: string, reason?: string, metadata = {}) {
  await pool.query(
    `insert into admin_ticket_actions (admin_user_id, ticket_id, user_id, action_type, reason, metadata)
     values ($1,$2,$3,$4,$5,$6)`,
    [adminUserId, ticketId, userId, actionType, reason ?? null, metadata]
  );
}

adminTicketsRouter.get("/search", async (req, res, next) => {
  try {
    const { q } = searchSchema.parse(req.query);
    const like = `%${q}%`;
    const { rows } = await pool.query(
      `select
         t.id as ticket_id, t.status as ticket_status, t.attendee_name, t.created_at,
         u.id as user_id, u.email, u.phone, u.display_name,
         e.title as event_title, e.starts_at,
         tt.name as ticket_type, tt.tier,
         qrc.status as qr_status
       from tickets t
       join users u on u.id = t.user_id
       join events e on e.id = t.event_id
       join ticket_types tt on tt.id = t.ticket_type_id
       left join qr_codes qrc on qrc.ticket_id = t.id
       where
         u.email ilike $1 or u.display_name ilike $1 or coalesce(u.phone, '') ilike $1 or
         t.attendee_name ilike $1 or t.id::text = $2 or u.id::text = $2
       order by t.created_at desc
       limit 50`,
      [like, q]
    );
    res.json({ results: rows });
  } catch (error) {
    next(error);
  }
});

adminTicketsRouter.get("/:ticketId", async (req, res, next) => {
  try {
    res.json({ ticket: await getTicketRecoveryBundle(req.params.ticketId) });
  } catch (error) {
    next(error);
  }
});

adminTicketsRouter.post("/:ticketId/show-qr", async (req, res, next) => {
  try {
    const bundle = await getTicketRecoveryBundle(req.params.ticketId);
    const qr = await regenerateTicketQr(req.params.ticketId, 60 * 15);
    await audit(req.user!.id, req.params.ticketId, bundle.user_id, "show_qr", "Admin displayed QR on screen");
    res.json({ ticket: bundle, qr, expiresInSeconds: 900 });
  } catch (error) {
    next(error);
  }
});

adminTicketsRouter.post("/:ticketId/resend-qr", async (req, res, next) => {
  try {
    const bundle = await getTicketRecoveryBundle(req.params.ticketId);
    const qr = await regenerateTicketQr(req.params.ticketId);
    await pool.query(
      `insert into notifications (user_id, title, body, metadata)
       values ($1, 'Tu QR GEN fue reenviado', 'Abre tu app GEN para ver tu boleto actualizado.', $2)`,
      [bundle.user_id, { ticketId: req.params.ticketId, qrToken: qr.token }]
    );
    await audit(req.user!.id, req.params.ticketId, bundle.user_id, "resend_qr", "Admin resent QR");
    emitUser(bundle.user_id, "ticket:qr_resent", { ticketId: req.params.ticketId });
    res.json({ delivered: true, ticket: bundle });
  } catch (error) {
    next(error);
  }
});

adminTicketsRouter.post("/:ticketId/invalidate", async (req, res, next) => {
  try {
    const input = z.object({ reason: z.string().min(3).max(240) }).parse(req.body);
    const result = await tx(async (client) => {
      const ticket = await client.query("select * from tickets where id = $1 for update", [req.params.ticketId]);
      if (!ticket.rows[0]) throw new Error("ticket_not_found");
      await client.query("update qr_codes set status = 'revoked', revoked_reason = $1 where ticket_id = $2", [input.reason, req.params.ticketId]);
      await client.query("update tickets set status = 'cancelled' where id = $1", [req.params.ticketId]);
      return ticket.rows[0];
    });
    await audit(req.user!.id, req.params.ticketId, result.user_id, "invalidate_ticket", input.reason);
    emitEvent(result.event_id, "ticket:invalidated", { ticketId: req.params.ticketId });
    res.json({ invalidated: true });
  } catch (error) {
    next(error);
  }
});

adminTicketsRouter.post("/:ticketId/refund", async (req, res, next) => {
  try {
    const input = z.object({ reason: z.string().min(3).max(240) }).parse(req.body);
    const result = await tx(async (client) => {
      const ticket = await client.query("select * from tickets where id = $1 for update", [req.params.ticketId]);
      if (!ticket.rows[0]) throw new Error("ticket_not_found");
      await client.query("update tickets set status = 'refunded' where id = $1", [req.params.ticketId]);
      await client.query("update payments set status = 'refunded', updated_at = now() where ticket_id = $1", [req.params.ticketId]);
      return ticket.rows[0];
    });
    await audit(req.user!.id, req.params.ticketId, result.user_id, "refund_ticket", input.reason);
    res.json({ refunded: true });
  } catch (error) {
    next(error);
  }
});

adminTicketsRouter.post("/:ticketId/manual-validate", async (req, res, next) => {
  try {
    const input = z.object({ deviceId: z.string().default("admin-manual"), reason: z.string().min(3).max(240) }).parse(req.body);
    const result = await tx(async (client) => {
      const ticket = await client.query("select * from tickets where id = $1 for update", [req.params.ticketId]);
      if (!ticket.rows[0]) throw new Error("ticket_not_found");
      if (ticket.rows[0].status === "used") return { ticket: ticket.rows[0], alreadyUsed: true };
      await client.query("update tickets set status = 'used', checked_in_at = now() where id = $1", [req.params.ticketId]);
      await client.query("update qr_codes set status = 'used', used_at = now() where ticket_id = $1", [req.params.ticketId]);
      await client.query(
        `insert into scans (ticket_id, event_id, staff_user_id, device_id, result, metadata)
         values ($1,$2,$3,$4,'accepted',$5)`,
        [req.params.ticketId, ticket.rows[0].event_id, req.user!.id, input.deviceId, { manual: true, reason: input.reason }]
      );
      return { ticket: ticket.rows[0], alreadyUsed: false };
    });
    await audit(req.user!.id, req.params.ticketId, result.ticket.user_id, "manual_validate", input.reason);
    emitEvent(result.ticket.event_id, "scan:accepted", { ticketId: req.params.ticketId, manual: true });
    res.json({ validated: !result.alreadyUsed, alreadyUsed: result.alreadyUsed });
  } catch (error) {
    next(error);
  }
});
