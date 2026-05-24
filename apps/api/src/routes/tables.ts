import { Router } from "express";
import { z } from "zod";
import { pool, tx } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { emitEvent } from "../services/realtime.js";

export const tablesRouter = Router();

tablesRouter.get("/events/:eventId/map", async (req, res, next) => {
  try {
    const [zones, tables] = await Promise.all([
      pool.query("select * from event_zones where event_id = $1 order by name", [req.params.eventId]),
      pool.query("select * from venue_tables where event_id = $1 order by label", [req.params.eventId])
    ]);
    res.json({ zones: zones.rows, tables: tables.rows });
  } catch (error) {
    next(error);
  }
});

tablesRouter.post("/:tableId/hold", requireAuth, async (req, res, next) => {
  try {
    const input = z.object({
      splitPaymentEnabled: z.boolean().default(false),
      invitedUsers: z.array(z.object({ email: z.string().email() })).default([])
    }).parse(req.body);

    const reservation = await tx(async (client) => {
      const table = await client.query("select * from venue_tables where id = $1 for update", [req.params.tableId]);
      if (!table.rows[0]) throw new Error("table_not_found");
      if (table.rows[0].status !== "available") throw new Error("table_unavailable");

      await client.query("update venue_tables set status = 'held', updated_at = now() where id = $1", [req.params.tableId]);
      const created = await client.query(
        `insert into table_reservations (table_id, user_id, event_id, status, split_payment_enabled, invited_users, hold_expires_at)
         values ($1,$2,$3,'held',$4,$5, now() + interval '15 minutes')
         returning *`,
        [req.params.tableId, req.user!.id, table.rows[0].event_id, input.splitPaymentEnabled, input.invitedUsers]
      );
      return { table: table.rows[0], reservation: created.rows[0] };
    });

    emitEvent(reservation.table.event_id, "table:held", { tableId: req.params.tableId });
    res.status(201).json(reservation);
  } catch (error) {
    next(error);
  }
});

tablesRouter.post("/reservations/:reservationId/confirm", requireAuth, async (req, res, next) => {
  try {
    const confirmed = await tx(async (client) => {
      const reservation = await client.query(
        `select tr.*, vt.min_spend_cents
         from table_reservations tr join venue_tables vt on vt.id = tr.table_id
         where tr.id = $1 and tr.user_id = $2 for update`,
        [req.params.reservationId, req.user!.id]
      );
      if (!reservation.rows[0]) throw new Error("reservation_not_found");
      await client.query("update table_reservations set status = 'paid', paid_at = now() where id = $1", [req.params.reservationId]);
      await client.query("update venue_tables set status = 'reserved', updated_at = now() where id = $1", [reservation.rows[0].table_id]);
      const purchase = await client.query(
        `insert into purchases (user_id, event_id, purchase_type, reference_id, amount_cents, status)
         values ($1,$2,'table',$3,$4,'paid') returning *`,
        [req.user!.id, reservation.rows[0].event_id, req.params.reservationId, reservation.rows[0].min_spend_cents]
      );
      return { reservation: reservation.rows[0], purchase: purchase.rows[0] };
    });
    emitEvent(confirmed.reservation.event_id, "table:reserved", { reservationId: req.params.reservationId });
    res.json(confirmed);
  } catch (error) {
    next(error);
  }
});
