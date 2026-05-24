import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const eventsRouter = Router();

const eventSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  description: z.string().optional(),
  venueName: z.string().min(2),
  city: z.string().min(2),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  capacity: z.number().int().positive(),
  coverUrl: z.string().url().optional()
});

eventsRouter.get("/", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `select id, title, slug, venue_name, city, starts_at, cover_url, min_price, vip, trending_score
       from event_cards
       order by trending_score desc, starts_at asc
       limit 24`
    );
    res.json({ events: rows });
  } catch (error) {
    next(error);
  }
});

eventsRouter.post("/", requireAuth, requireRole("organizer", "admin", "super_admin"), async (req, res, next) => {
  try {
    const input = eventSchema.parse(req.body);
    const { rows } = await pool.query(
      `insert into events (organizer_id, title, slug, description, venue_name, city, starts_at, ends_at, capacity, cover_url)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       returning *`,
      [req.user!.id, input.title, input.slug, input.description ?? "", input.venueName, input.city, input.startsAt, input.endsAt ?? null, input.capacity, input.coverUrl ?? null]
    );
    res.status(201).json({ event: rows[0] });
  } catch (error) {
    next(error);
  }
});

eventsRouter.get("/:id", async (req, res, next) => {
  try {
    const [event, ticketTypes] = await Promise.all([
      pool.query("select * from events where id = $1", [req.params.id]),
      pool.query(
        `select id, event_id, name, tier, price_cents, quantity, benefits
         from ticket_types
         where event_id = $1
         order by price_cents asc`,
        [req.params.id]
      )
    ]);
    if (!event.rows[0]) return res.status(404).json({ error: "event_not_found" });
    res.json({ event: event.rows[0], ticketTypes: ticketTypes.rows });
  } catch (error) {
    next(error);
  }
});
