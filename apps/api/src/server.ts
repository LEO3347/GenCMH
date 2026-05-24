import express from "express";
import http from "http";
import { ZodError } from "zod";
import { security } from "./middleware/security.js";
import { authRouter } from "./routes/auth.js";
import { eventsRouter } from "./routes/events.js";
import { ticketsRouter } from "./routes/tickets.js";
import { scansRouter } from "./routes/scans.js";
import { paymentsRouter } from "./routes/payments.js";
import { adminRouter } from "./routes/admin.js";
import { socialRouter } from "./routes/social.js";
import { reservationsRouter } from "./routes/reservations.js";
import { commerceRouter } from "./routes/commerce.js";
import { adminTicketsRouter } from "./routes/adminTickets.js";
import { meRouter } from "./routes/me.js";
import { tablesRouter } from "./routes/tables.js";
import { rewardsRouter } from "./routes/rewards.js";
import { config } from "./config.js";
import { initRealtime } from "./services/realtime.js";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(security);

app.get("/health", (_req, res) => res.json({ ok: true, service: "gen-api" }));
app.use("/api/auth", authRouter);
app.use("/api/events", eventsRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/scans", scansRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/admin/tickets", adminTicketsRouter);
app.use("/api/social", socialRouter);
app.use("/api/reservations", reservationsRouter);
app.use("/api/commerce", commerceRouter);
app.use("/api/me", meRouter);
app.use("/api/tables", tablesRouter);
app.use("/api/rewards", rewardsRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) return res.status(422).json({ error: "validation_error", issues: error.issues });
  const message = error instanceof Error ? error.message : "internal_error";
  const status = message.endsWith("_not_found") ? 404 : 500;
  res.status(status).json({ error: message });
});

const server = http.createServer(app);
initRealtime(server);

server.listen(config.port, '0.0.0.0', () => {
  console.log(`GEN API listening on http://0.0.0:${config.port}`);
});
