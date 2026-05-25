import { z } from "zod";

const optionalString = z.preprocess((value) => value === "" ? undefined : value, z.string().optional());
const defaultedString = (fallback: string) => z.preprocess((value) => value === "" ? undefined : value, z.string().default(fallback));
const defaultedSecret = (fallback: string) => z.preprocess((value) => value === "" ? undefined : value, z.string().min(8).default(fallback));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: defaultedString("postgresql://gen:gen@localhost:5432/gen"),
  JWT_SECRET: z.preprocess((value) => value === "" ? undefined : value, z.string().min(32).default("render-admin-dev-secret-change-after-first-deploy")),
  COOKIE_DOMAIN: optionalString,
  CORS_ORIGIN: defaultedString("http://localhost:5173"),
  FRONTEND_URL: defaultedString("http://localhost:5173"),
  S3_BUCKET: optionalString,
  S3_REGION: optionalString,
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,
  SLACK_WEBHOOK_URL: optionalString,
  SMTP_URL: optionalString,
  QR_ENCRYPTION_KEY: defaultedString("render-dev-qr-encryption-key-change-me"),
  QR_SIGNING_SECRET: defaultedString("render-dev-qr-signing-secret-change-me"),
  ADMIN_BOOTSTRAP_EMAIL: z.preprocess((value) => value === "" ? undefined : value, z.string().email().default("admin@gen.mx")),
  ADMIN_BOOTSTRAP_PASSWORD: defaultedSecret("GenAdmin123!")
});

export const config = envSchema.parse(process.env);
export const isProduction = config.NODE_ENV === "production";
