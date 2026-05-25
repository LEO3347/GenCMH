import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { pinoHttp } from "pino-http";
import { config } from "./config.js";
import "./types.js";
import { authRouter } from "./routes/auth.routes.js";
import { expenseRouter } from "./routes/expense.routes.js";
import { analyticsRouter } from "./routes/analytics.routes.js";
import { automationRouter } from "./routes/automation.routes.js";
import { scanRouter } from "./routes/scan.routes.js";
import { adminUsersRouter } from "./routes/admin-users.routes.js";
import { startRecurringExpenseJob } from "./jobs/recurrence.js";

const app = express();

app.set("trust proxy", 1);
app.use(pinoHttp());
app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

app.get("/healthz", (_req, res) => res.json({ ok: true, at: new Date().toISOString() }));
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/expenses", expenseRouter);
app.use("/api/v1/analytics", analyticsRouter);
app.use("/api/v1/scans", scanRouter);
app.use("/api/v1/admins", adminUsersRouter);
app.use("/api/v1", automationRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : "INTERNAL_ERROR";
  res.status(500).json({ error: message });
});

app.listen(config.PORT, () => {
  startRecurringExpenseJob();
  console.log(`Admin FinOps API listening on ${config.PORT}`);
});
