import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const meRouter = Router();

meRouter.use(requireAuth);

meRouter.get("/", async (req, res, next) => {
  try {
    const [user, wallet, purchases, rewards] = await Promise.all([
      pool.query(
        `select u.id, u.email, u.phone, u.display_name, u.avatar_url, u.role, u.email_verified_at,
                vl.name as vip_level, vl.rank as vip_rank
         from users u left join vip_levels vl on vl.id = u.vip_level_id
         where u.id = $1`,
        [req.user!.id]
      ),
      pool.query("select * from wallets where user_id = $1", [req.user!.id]),
      pool.query(
        `select p.*, e.title as event_title
         from purchases p left join events e on e.id = p.event_id
         where p.user_id = $1
         order by p.created_at desc limit 20`,
        [req.user!.id]
      ),
      pool.query("select * from rewards where user_id = $1 order by created_at desc limit 20", [req.user!.id])
    ]);
    res.json({ user: user.rows[0], wallet: wallet.rows[0] ?? null, purchases: purchases.rows, rewards: rewards.rows });
  } catch (error) {
    next(error);
  }
});

meRouter.patch("/", async (req, res, next) => {
  try {
    const input = z.object({
      displayName: z.string().min(2).max(80).optional(),
      phone: z.string().min(6).max(30).optional(),
      avatarUrl: z.string().url().optional()
    }).parse(req.body);

    const { rows } = await pool.query(
      `update users
       set display_name = coalesce($2, display_name),
           phone = coalesce($3, phone),
           avatar_url = coalesce($4, avatar_url),
           updated_at = now()
       where id = $1
       returning id, email, phone, display_name, avatar_url, role`,
      [req.user!.id, input.displayName ?? null, input.phone ?? null, input.avatarUrl ?? null]
    );
    res.json({ user: rows[0] });
  } catch (error) {
    next(error);
  }
});

meRouter.post("/password-recovery", (req, res) => {
  res.status(202).json({
    accepted: true,
    next: "Enviar correo con token temporal de recuperacion usando proveedor transaccional."
  });
});

meRouter.post("/email-verification", (req, res) => {
  res.status(202).json({
    accepted: true,
    next: "Enviar correo de verificacion con token temporal firmado."
  });
});
