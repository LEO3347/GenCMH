import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "../config.js";

export const security = [
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }),
  cors({
    origin: [config.webOrigin, "http://localhost:8081", "exp://localhost:8081"],
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
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

export const scanLimiter = rateLimit({
  windowMs: 10_000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false
});
