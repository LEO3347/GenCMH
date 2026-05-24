import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const reservationsRouter = Router();

const reservationSchema = z.object({
  eventId: z.string().uuid(),
  reservationType: z.enum(["table", "vip_booth", "backstage", "bottle_service"]),
  guestCount: z.number().int().positive().max(30)
});

reservationsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const input = reservationSchema.parse(req.body);
    const { rows } = await pool.query(
      `insert into reservations (event_id, user_id, reservation_type, guest_count, status, expires_at)
       values ($1,$2,$3,$4,'pending', now() + interval '20 minutes')
       returning *`,
      [input.eventId, req.user!.id, input.reservationType, input.guestCount]
    );
    res.status(201).json({ reservation: rows[0] });
  } catch (error) {
    next(error);
  }
});

reservationsRouter.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `select r.*, e.title, e.starts_at, e.venue_name
       from reservations r join events e on e.id = r.event_id
       where r.user_id = $1 order by r.created_at desc`,
      [req.user!.id]
    );
    res.json({ reservations: rows });
  } catch (error) {
    next(error);
  }
});
