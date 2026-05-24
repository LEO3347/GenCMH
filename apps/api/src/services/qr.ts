import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "crypto";
import QRCode from "qrcode";
import { config } from "../config.js";

export interface SecureQrPayload {
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
  const raw = Buffer.from(config.qrEncryptionKey, "base64");
  return raw.length === 32 ? raw : createHmac("sha256", config.qrSigningSecret).update(config.qrEncryptionKey).digest();
}

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string) {
  return createHmac("sha256", config.qrSigningSecret).update(data).digest("base64url");
}

export function hashToken(token: string) {
  return createHmac("sha256", config.qrSigningSecret).update(token).digest("hex");
}

export function createSecureQr(payload: Omit<SecureQrPayload, "nonce" | "iat" | "exp" | "kid">, ttlSeconds = 60 * 60 * 12) {
  const iv = randomBytes(12);
  const iat = Math.floor(Date.now() / 1000);
  const body: SecureQrPayload = {
    ...payload,
    nonce: randomBytes(18).toString("base64url"),
    iat,
    exp: iat + ttlSeconds,
    kid: "gen-v1"
  };
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(body), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const compact = ["GEN1", b64url(iv), b64url(tag), b64url(encrypted)].join(".");
  const signature = sign(compact);
  return `${compact}.${signature}`;
}

export function verifySecureQr(token: string): SecureQrPayload {
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== "GEN1") throw new Error("malformed_qr");
  const compact = parts.slice(0, 4).join(".");
  const expected = Buffer.from(sign(compact));
  const received = Buffer.from(parts[4]);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new Error("invalid_signature");
  }

  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  const encrypted = Buffer.from(parts[3], "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  const payload = JSON.parse(decrypted) as SecureQrPayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error("expired_qr");
  return payload;
}

export async function renderQrDataUrl(token: string) {
  return QRCode.toDataURL(token, {
    errorCorrectionLevel: "H",
    margin: 1,
    color: {
      dark: "#03030a",
      light: "#ffffff"
    }
  });
}
