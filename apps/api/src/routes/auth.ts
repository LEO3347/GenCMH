import { Router, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { config } from "../config.js";
import { authLimiter } from "../middleware/security.js";

export const authRouter = Router();

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).optional()
});

function invalidCredentials(res: Response) {
  return res.status(401).json({ error: "invalid_credentials" });
}

function tokenFor(user: { id: string; email: string; role: string }) {
  return jwt.sign(user, config.jwtSecret, {
    expiresIn: "30d",
    issuer: config.jwtIssuer,
    audience: config.jwtAudience
  });
}

authRouter.post("/register", authLimiter, async (req, res, next) => {
  try {
    const input = credentials.parse(req.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const { rows } = await pool.query(
      `insert into users (email, password_hash, display_name, role)
       values ($1, $2, $3, 'guest')
       returning id, email, role, display_name`,
      [input.email.toLowerCase(), passwordHash, input.name ?? input.email.split("@")[0]]
    );
    res.status(201).json({ user: rows[0], token: tokenFor(rows[0]) });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "23505") {
      return res.status(409).json({ error: "email_already_registered" });
    }
    next(error);
  }
});

authRouter.post("/login", authLimiter, async (req, res, next) => {
  try {
    const input = credentials.omit({ name: true }).parse(req.body);
    const { rows } = await pool.query("select id, email, role, password_hash from users where email = $1", [input.email.toLowerCase()]);
    const user = rows[0];

    if (!user?.password_hash) return invalidCredentials(res);

    const passwordMatches = await bcrypt.compare(input.password, user.password_hash);
    if (!passwordMatches) return invalidCredentials(res);

    await pool.query("insert into user_sessions (user_id, ip_address, user_agent) values ($1, $2, $3)", [
      user.id,
      req.ip,
      req.header("user-agent") ?? ""
    ]);
    res.json({ user: { id: user.id, email: user.email, role: user.role }, token: tokenFor(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/oauth/:provider", authLimiter, (req, res) => {
  res.status(202).json({
    provider: req.params.provider,
    status: "stub",
    next: "Verificar id_token de Google o Apple, crear usuario y emitir JWT."
  });
});
