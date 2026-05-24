import "dotenv/config";
import { randomBytes } from "crypto";

const fallbackKey = randomBytes(32).toString("base64");

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/gen",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-change-this-secret-before-production",
  jwtIssuer: process.env.JWT_ISSUER ?? "gen-api",
  jwtAudience: process.env.JWT_AUDIENCE ?? "gen-clients",
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  qrEncryptionKey: process.env.QR_ENCRYPTION_KEY ?? fallbackKey,
  qrSigningSecret: process.env.QR_SIGNING_SECRET ?? "dev-only-qr-signing-secret",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  paypalClientId: process.env.PAYPAL_CLIENT_ID ?? "",
  paypalClientSecret: process.env.PAYPAL_CLIENT_SECRET ?? "",
  mercadoPagoAccessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? ""
};
