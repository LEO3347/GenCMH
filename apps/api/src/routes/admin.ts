import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("admin", "super_admin", "organizer"));

adminRouter.get("/dashboard", async (_req, res, next) => {
  try {
    const [sales, users, scans, fraud] = await Promise.all([
      pool.query("select coalesce(sum(amount_cents),0)::int as amount_cents, count(*)::int as payments from payments where status in ('paid','pending')"),
      pool.query("select count(*)::int as users from users"),
      pool.query("select count(*)::int as scans from scans where created_at > now() - interval '24 hours'"),
      pool.query("select count(*)::int as fraud_alerts from fraud_logs where created_at > now() - interval '24 hours'")
    ]);

    res.json({
      sales: sales.rows[0],
      users: users.rows[0],
      scans: scans.rows[0],
      fraud: fraud.rows[0]
    });
  } catch (error) {
    next(error);
  }
});
