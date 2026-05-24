import { Router } from "express";
import { z } from "zod";
import { pool, tx } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { createSecureQr, hashToken, renderQrDataUrl } from "../services/qr.js";
import { regenerateTicketQr } from "../services/ticketRecovery.js";

export const ticketsRouter = Router();

const createTicketSchema = z.object({
  eventId: z.string().uuid(),
  ticketTypeId: z.string().uuid(),
  attendeeName: z.string().min(2)
});

ticketsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const input = createTicketSchema.parse(req.body);
    const result = await tx(async (client) => {
      const ticketType = await client.query("select * from ticket_types where id = $1 and event_id = $2", [input.ticketTypeId, input.eventId]);
      if (!ticketType.rows[0]) throw new Error("ticket_type_not_found");

      const ticket = await client.query(
        `insert into tickets (event_id, user_id, ticket_type_id, attendee_name, status, price_cents)
         values ($1,$2,$3,$4,'issued',$5)
         returning *`,
        [input.eventId, req.user!.id, input.ticketTypeId, input.attendeeName, ticketType.rows[0].price_cents]
      );

      const token = createSecureQr({
        ticketId: ticket.rows[0].id,
        eventId: input.eventId,
        userId: req.user!.id
      });

      await client.query(
        `insert into qr_codes (ticket_id, token_hash, status, expires_at)
         values ($1,$2,'active', now() + interval '12 hours')`,
        [ticket.rows[0].id, hashToken(token)]
      );

      await client.query(
        `insert into purchases (user_id, event_id, purchase_type, reference_id, amount_cents, status)
         values ($1,$2,'ticket',$3,$4,'paid')`,
        [req.user!.id, input.eventId, ticket.rows[0].id, ticket.rows[0].price_cents]
      );

      return { ticket: ticket.rows[0], token };
    });

    res.status(201).json({
      ticket: result.ticket,
      qr: {
        token: result.token,
        image: await renderQrDataUrl(result.token)
      }
    });
  } catch (error) {
    next(error);
  }
});

ticketsRouter.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `select t.*, e.title as event_title, e.starts_at, tt.name as tier
       from tickets t
       join events e on e.id = t.event_id
       join ticket_types tt on tt.id = t.ticket_type_id
       where t.user_id = $1
       order by e.starts_at desc`,
      [req.user!.id]
    );
    res.json({ tickets: rows });
  } catch (error) {
    next(error);
  }
});

ticketsRouter.post("/:ticketId/qr", requireAuth, async (req, res, next) => {
  try {
    const ticketId = String(req.params.ticketId);
    const { rows } = await pool.query("select id from tickets where id = $1 and user_id = $2", [ticketId, req.user!.id]);
    if (!rows[0]) return res.status(404).json({ error: "ticket_not_found" });
    const qr = await regenerateTicketQr(ticketId);
    res.json({ qr });
  } catch (error) {
    next(error);
  }
});
