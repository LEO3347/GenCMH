import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "../config.js";

const allowedOrigins = new Set([
  config.webOrigin,
  "http://localhost:3000",
  "http://localhost:8081",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:8081",
  "exp://localhost:8081"
]);

function isAllowedOrigin(origin?: string) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  if (/^https:\/\/gen-web(-[a-z0-9]+)?\.onrender\.com$/i.test(origin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/i.test(origin)) return true;
  if (/^exp:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/i.test(origin)) return true;
  return false;
}

export const security = [
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }),
  cors({
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin));
    },
    credentials: true
  }),
  rateLimit({
    windowMs: 60_000,
    limit: 160,
    standardHeaders: "draft-7",
    legacyHeaders: false
  })
];

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 120,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

export const scanLimiter = rateLimit({
  windowMs: 10_000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false
});
