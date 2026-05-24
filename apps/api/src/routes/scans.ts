import { createHmac } from "crypto";
import { Router } from "express";
import { z } from "zod";
import { tx } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { scanLimiter } from "../middleware/security.js";
import { hashToken, verifySecureQr } from "../services/qr.js";
import { config } from "../config.js";
import { emitEvent } from "../services/realtime.js";

export const scansRouter = Router();

const scanSchema = z.object({
  token: z.string().min(40),
  deviceId: z.string().min(6),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

const offlineScanSchema = z.object({
  token: z.string().min(40),
  deviceId: z.string().min(6),
  scannedAt: z.string().datetime(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

const syncScansSchema = z.object({
  deviceId: z.string().min(6),
  eventId: z.string().uuid().optional(),
  scans: z.array(offlineScanSchema).max(500)
});

function batchHash(input: unknown) {
  return createHmac("sha256", config.qrSigningSecret).update(JSON.stringify(input)).digest("hex");
}

scansRouter.post("/validate", scanLimiter, requireAuth, requireRole("staff", "organizer", "admin", "super_admin"), async (req, res, next) => {
  try {
    const input = scanSchema.parse(req.body);
    let payload;
    try {
      payload = verifySecureQr(input.token);
    } catch (error) {
      await tx((client) =>
        client.query(
          `insert into fraud_logs (event_id, ticket_id, user_id, reason, metadata)
           values (null, null, $1, $2, $3)`,
          [req.user!.id, (error as Error).message, { deviceId: input.deviceId }]
        )
      );
      return res.status(400).json({ valid: false, reason: (error as Error).message });
    }

    const result = await tx(async (client) => {
      const qr = await client.query(
        `select q.*, t.status as ticket_status, t.attendee_name, tt.name as tier, u.display_name, e.title as event_title
         from qr_codes q
         join tickets t on t.id = q.ticket_id
         join ticket_types tt on tt.id = t.ticket_type_id
         join users u on u.id = t.user_id
         join events e on e.id = t.event_id
         where q.ticket_id = $1 and q.token_hash = $2
         for update`,
        [payload.ticketId, hashToken(input.token)]
      );
      const record = qr.rows[0];
      const metadata = { deviceId: input.deviceId, latitude: input.latitude, longitude: input.longitude };

      if (!record || record.status !== "active" || record.ticket_status === "used") {
        await client.query(
          `insert into fraud_logs (event_id, ticket_id, user_id, reason, metadata)
           values ($1, $2, $3, 'duplicate_or_invalid_scan', $4)`,
          [payload.eventId, payload.ticketId, payload.userId, metadata]
        );
        return { valid: false, reason: "duplicate_or_invalid_scan", record };
      }

      await client.query("update qr_codes set status = 'used', used_at = now() where id = $1", [record.id]);
      await client.query("update tickets set status = 'used', checked_in_at = now() where id = $1", [payload.ticketId]);
      await client.query(
        `insert into scans (ticket_id, event_id, staff_user_id, device_id, latitude, longitude, result, metadata)
         values ($1,$2,$3,$4,$5,$6,'accepted',$7)`,
        [payload.ticketId, payload.eventId, req.user!.id, input.deviceId, input.latitude ?? null, input.longitude ?? null, { online: true }]
      );

      return { valid: true, record };
    });

    if (result.valid && result.record) {
      emitEvent(result.record.event_id, "scan:accepted", {
        ticketId: payload.ticketId,
        attendee: result.record.attendee_name,
        tier: result.record.tier
      });
    }

    res.json({
      valid: result.valid,
      reason: result.reason,
      attendee: result.record
        ? {
            name: result.record.attendee_name,
            buyer: result.record.display_name,
            tier: result.record.tier,
            event: result.record.event_title
          }
        : null
    });
  } catch (error) {
    next(error);
  }
});

scansRouter.post("/sync", scanLimiter, requireAuth, requireRole("staff", "security", "organizer", "admin", "super_admin"), async (req, res, next) => {
  try {
    const input = syncScansSchema.parse(req.body);
    const accepted: Array<{ accepted: true; ticketId: string; eventId: string }> = [];
    const rejected: Array<{ tokenHash: string; reason: string }> = [];

    for (const scan of input.scans) {
      try {
        const payload = verifySecureQr(scan.token);
        const result = await tx(async (client) => {
          const qr = await client.query(
            `select q.*, t.status as ticket_status, t.attendee_name, tt.name as tier
             from qr_codes q
             join tickets t on t.id = q.ticket_id
             join ticket_types tt on tt.id = t.ticket_type_id
             where q.ticket_id = $1 and q.token_hash = $2
             for update`,
            [payload.ticketId, hashToken(scan.token)]
          );
          const record = qr.rows[0];
          if (!record || record.status !== "active" || record.ticket_status === "used") {
            await client.query(
              `insert into fraud_logs (event_id, ticket_id, user_id, reason, metadata)
               values ($1,$2,$3,'offline_duplicate_or_invalid_scan',$4)`,
              [payload.eventId, payload.ticketId, payload.userId, { deviceId: scan.deviceId, scannedAt: scan.scannedAt }]
            );
            return { accepted: false as const, reason: "duplicate_or_invalid_scan" };
          }
          await client.query("update qr_codes set status = 'used', used_at = now() where id = $1", [record.id]);
          await client.query("update tickets set status = 'used', checked_in_at = now() where id = $1", [payload.ticketId]);
          await client.query(
            `insert into scans (ticket_id, event_id, staff_user_id, device_id, latitude, longitude, result, offline, synced_at, metadata)
             values ($1,$2,$3,$4,$5,$6,'accepted',true,now(),$7)`,
            [payload.ticketId, payload.eventId, req.user!.id, scan.deviceId, scan.latitude ?? null, scan.longitude ?? null, { scannedAt: scan.scannedAt }]
          );
          return { accepted: true as const, ticketId: payload.ticketId, eventId: payload.eventId };
        });
        if (result.accepted === true) {
          accepted.push({ accepted: true, ticketId: result.ticketId, eventId: result.eventId });
          emitEvent(result.eventId, "scan:accepted", { ticketId: result.ticketId, offline: true });
        } else {
          rejected.push({ tokenHash: hashToken(scan.token), reason: result.reason ?? "rejected" });
        }
      } catch (error) {
        rejected.push({ tokenHash: hashToken(scan.token), reason: error instanceof Error ? error.message : "invalid_scan" });
      }
    }

    await tx((client) =>
      client.query(
        `insert into offline_scan_batches (device_id, staff_user_id, event_id, payload_hash, accepted_count, rejected_count, metadata)
         values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (device_id, payload_hash) do nothing`,
        [input.deviceId, req.user!.id, input.eventId ?? null, batchHash(input), accepted.length, rejected.length, { rejected }]
      )
    );

    res.json({ accepted, rejected, syncedAt: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});
