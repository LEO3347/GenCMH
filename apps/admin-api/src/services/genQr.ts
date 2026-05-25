import { createDecipheriv, createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";

export interface GenQrPayload {
  ticketId: string;
  eventId: string;
  userId: string;
  purpose?: "ticket" | "pickup";
  orderId?: string;
  nonce: string;
  iat: number;
  exp: number;
  kid: "gen-v1";
}

function key() {
  const raw = Buffer.from(config.QR_ENCRYPTION_KEY, "base64");
  return raw.length === 32 ? raw : createHmac("sha256", config.QR_SIGNING_SECRET).update(config.QR_ENCRYPTION_KEY).digest();
}

function sign(data: string) {
  return createHmac("sha256", config.QR_SIGNING_SECRET).update(data).digest("base64url");
}

export function hashToken(token: string) {
  return createHmac("sha256", config.QR_SIGNING_SECRET).update(token).digest("hex");
}

export function verifyGenQr(token: string): GenQrPayload {
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== "GEN1") throw new Error("malformed_qr");

  const compact = parts.slice(0, 4).join(".");
  const expected = Buffer.from(sign(compact));
  const received = Buffer.from(parts[4]);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new Error("invalid_signature");
  }

  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(parts[1], "base64url"));
  decipher.setAuthTag(Buffer.from(parts[2], "base64url"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(parts[3], "base64url")), decipher.final()]).toString("utf8");
  const payload = JSON.parse(decrypted) as GenQrPayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error("expired_qr");
  return payload;
}
