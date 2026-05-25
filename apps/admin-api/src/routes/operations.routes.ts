import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../security/auth.js";

export const operationsRouter = Router();

operationsRouter.use(requireAuth);

const eventSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().default(""),
  venueName: z.string().min(2),
  city: z.string().min(2),
  startsAt: z.string().datetime(),
  capacity: z.coerce.number().int().positive(),
  vip: z.boolean().default(false),
  status: z.enum(["draft", "published"]).default("draft"),
  coverUrl: z.string().url().optional().or(z.literal(""))
});

const ticketTypeSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().min(2),
  tier: z.string().min(2),
  priceCents: z.coerce.number().int().min(0),
  quantity: z.coerce.number().int().min(0),
  perUserLimit: z.coerce.number().int().min(1).max(20).default(8)
});

const ticketStatusSchema = z.object({
  status: z.enum(["issued", "used", "cancelled", "refunded"])
});

async function organizerId() {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `insert into users (email, display_name, role)
     values ('admin@gen.mx', 'Admin GEN', 'super_admin')
     on conflict (email) do update set role = 'super_admin'
     returning id`
  );
  return rows[0].id;
}

operationsRouter.get("/summary", async (_req, res) => {
  const rows = await prisma.$queryRawUnsafe<Array<{
    tickets_sold: bigint;
    tickets_used: bigint;
    gross_cents: bigint;
    active_events: bigint;
  }>>(
    `select
       count(t.id)::bigint as tickets_sold,
       count(t.id) filter (where t.status = 'used')::bigint as tickets_used,
       coalesce(sum(t.price_cents) filter (where t.status in ('issued', 'used')), 0)::bigint as gross_cents,
       count(distinct e.id) filter (where e.status <> 'draft')::bigint as active_events
     from events e
     left join tickets t on t.event_id = e.id`
  );

  const row = rows[0] ?? { tickets_sold: 0n, tickets_used: 0n, gross_cents: 0n, active_events: 0n };
  res.json({
    ticketsSold: Number(row.tickets_sold),
    ticketsUsed: Number(row.tickets_used),
    grossCents: Number(row.gross_cents),
    activeEvents: Number(row.active_events)
  });
});

operationsRouter.get("/tickets", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const like = `%${q}%`;
  const rows = await prisma.$queryRawUnsafe(
    `select
       t.id,
       t.attendee_name,
       t.status,
       t.price_cents,
       t.created_at,
       u.email,
       u.display_name,
       e.title as event_title,
       tt.name as ticket_type,
       qrc.status as qr_status
     from tickets t
     join users u on u.id = t.user_id
     join events e on e.id = t.event_id
     join ticket_types tt on tt.id = t.ticket_type_id
     left join qr_codes qrc on qrc.ticket_id = t.id
     where $1 = ''
        or u.email ilike $2
        or u.display_name ilike $2
        or t.attendee_name ilike $2
        or t.id::text = $1
     order by t.created_at desc
     limit 100`,
    q,
    like
  );
  res.json({ tickets: rows });
});

operationsRouter.patch("/tickets/:ticketId/status", async (req, res) => {
  const parsed = ticketStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; status: string }>>(
    `update tickets
     set status = $2::ticket_status,
         checked_in_at = case when $2 = 'used' then now() else checked_in_at end
     where id = $1::uuid
     returning id, status`,
    req.params.ticketId,
    parsed.data.status
  );
  if (!rows[0]) return res.status(404).json({ error: "TICKET_NOT_FOUND" });
  if (parsed.data.status === "cancelled") {
    await prisma.$executeRawUnsafe("update qr_codes set status = 'revoked', revoked_reason = 'admin_cancelled' where ticket_id = $1::uuid", req.params.ticketId);
  }
  res.json({ ticket: rows[0] });
});

operationsRouter.get("/events", async (_req, res) => {
  const rows = await prisma.$queryRawUnsafe(
    `select
       e.id, e.title, e.slug, e.venue_name, e.city, e.starts_at, e.capacity, e.vip, e.status,
       count(t.id)::int as tickets_sold,
       coalesce(sum(t.price_cents), 0)::int as gross_cents
     from events e
     left join tickets t on t.event_id = e.id and t.status in ('issued', 'used')
     group by e.id
     order by e.starts_at desc
     limit 100`
  );
  res.json({ events: rows });
});

operationsRouter.post("/events", async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

  const ownerId = await organizerId();
  const event = await prisma.$queryRawUnsafe(
    `insert into events (
       organizer_id, title, slug, description, cover_url, venue_name, city, starts_at, capacity, vip, status
     ) values ($1::uuid, $2, $3, $4, nullif($5, ''), $6, $7, $8::timestamptz, $9, $10, $11)
     returning id, title, slug, venue_name, city, starts_at, capacity, vip, status`,
    ownerId,
    parsed.data.title,
    parsed.data.slug,
    parsed.data.description,
    parsed.data.coverUrl ?? "",
    parsed.data.venueName,
    parsed.data.city,
    parsed.data.startsAt,
    parsed.data.capacity,
    parsed.data.vip,
    parsed.data.status
  );
  res.status(201).json({ event: Array.isArray(event) ? event[0] : event });
});

operationsRouter.get("/ticket-types", async (req, res) => {
  const eventId = String(req.query.eventId ?? "");
  const rows = await prisma.$queryRawUnsafe(
    `select tt.*, e.title as event_title
     from ticket_types tt
     join events e on e.id = tt.event_id
     where $1 = '' or tt.event_id = $1::uuid
     order by tt.created_at desc
     limit 100`,
    eventId
  );
  res.json({ ticketTypes: rows });
});

operationsRouter.post("/ticket-types", async (req, res) => {
  const parsed = ticketTypeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });

  const rows = await prisma.$queryRawUnsafe(
    `insert into ticket_types (event_id, name, tier, price_cents, quantity, per_user_limit)
     values ($1::uuid, $2, $3, $4, $5, $6)
     returning *`,
    parsed.data.eventId,
    parsed.data.name,
    parsed.data.tier,
    parsed.data.priceCents,
    parsed.data.quantity,
    parsed.data.perUserLimit
  );
  res.status(201).json({ ticketType: Array.isArray(rows) ? rows[0] : rows });
});
