import { pool, tx } from "../db/pool.js";
import { createSecureQr, hashToken, renderQrDataUrl } from "./qr.js";

export async function regenerateTicketQr(ticketId: string, ttlSeconds = 60 * 60 * 12) {
  return tx(async (client) => {
    const { rows } = await client.query(
      `select t.id, t.event_id, t.user_id
       from tickets t
       where t.id = $1
       for update`,
      [ticketId]
    );
    const ticket = rows[0];
    if (!ticket) throw new Error("ticket_not_found");

    const token = createSecureQr({
      ticketId: ticket.id,
      eventId: ticket.event_id,
      userId: ticket.user_id,
      purpose: "ticket"
    }, ttlSeconds);

    await client.query(
      `update qr_codes
       set token_hash = $1, status = 'active', expires_at = now() + ($2 || ' seconds')::interval, used_at = null, revoked_reason = null
       where ticket_id = $3`,
      [hashToken(token), ttlSeconds, ticketId]
    );

    return { token, image: await renderQrDataUrl(token), ticket };
  });
}

export async function getTicketRecoveryBundle(ticketId: string) {
  const { rows } = await pool.query(
    `select
       t.id as ticket_id, t.status as ticket_status, t.attendee_name, t.price_cents, t.checked_in_at,
       u.id as user_id, u.email, u.phone, u.display_name, u.avatar_url,
       e.id as event_id, e.title as event_title, e.starts_at,
       tt.name as ticket_type, tt.tier,
       q.status as qr_status, q.expires_at, q.used_at
     from tickets t
     join users u on u.id = t.user_id
     join events e on e.id = t.event_id
     join ticket_types tt on tt.id = t.ticket_type_id
     left join qr_codes q on q.ticket_id = t.id
     where t.id = $1`,
    [ticketId]
  );
  if (!rows[0]) throw new Error("ticket_not_found");
  return rows[0];
}
