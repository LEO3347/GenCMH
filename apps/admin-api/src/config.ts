import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32).default("render-admin-dev-secret-change-after-first-deploy"),
  COOKIE_DOMAIN: z.string().optional(),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().optional(),
  SMTP_URL: z.string().optional(),
  QR_ENCRYPTION_KEY: z.string().default("render-dev-qr-encryption-key-change-me"),
  QR_SIGNING_SECRET: z.string().default("render-dev-qr-signing-secret-change-me"),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().default("admin@gen.mx"),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(8).default("GenAdmin123!")
});

export const config = envSchema.parse(process.env);
export const isProduction = config.NODE_ENV === "production";
