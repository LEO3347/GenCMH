import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const socialRouter = Router();

socialRouter.get("/events/:eventId/feed", async (req, res, next) => {
  try {
    const [comments, likes, stories] = await Promise.all([
      pool.query(
        `select c.id, c.body, c.created_at, u.display_name, u.avatar_url
         from comments c join users u on u.id = c.user_id
         where c.event_id = $1 order by c.created_at desc limit 40`,
        [req.params.eventId]
      ),
      pool.query("select count(*)::int as likes from likes where event_id = $1", [req.params.eventId]),
      pool.query("select * from stories where event_id = $1 and expires_at > now() order by created_at desc limit 20", [req.params.eventId])
    ]);
    res.json({ comments: comments.rows, likes: likes.rows[0].likes, stories: stories.rows });
  } catch (error) {
    next(error);
  }
});

socialRouter.post("/events/:eventId/likes", requireAuth, async (req, res, next) => {
  try {
    await pool.query(
      "insert into likes (user_id, event_id) values ($1, $2) on conflict do nothing",
      [req.user!.id, req.params.eventId]
    );
    res.status(201).json({ liked: true });
  } catch (error) {
    next(error);
  }
});

socialRouter.delete("/events/:eventId/likes", requireAuth, async (req, res, next) => {
  try {
    await pool.query("delete from likes where user_id = $1 and event_id = $2", [req.user!.id, req.params.eventId]);
    res.json({ liked: false });
  } catch (error) {
    next(error);
  }
});

socialRouter.post("/events/:eventId/comments", requireAuth, async (req, res, next) => {
  try {
    const body = z.object({ body: z.string().min(1).max(1200), parentId: z.string().uuid().optional() }).parse(req.body);
    const { rows } = await pool.query(
      `insert into comments (user_id, event_id, body, parent_id)
       values ($1,$2,$3,$4) returning *`,
      [req.user!.id, req.params.eventId, body.body, body.parentId ?? null]
    );
    res.status(201).json({ comment: rows[0] });
  } catch (error) {
    next(error);
  }
});

socialRouter.get("/recommendations", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `select e.*, coalesce(r.score, 0.72) as ai_score, coalesce(r.reason, 'Coincide con tus generos, ciudad y nivel VIP.') as reason
       from events e
       left join recommendations r on r.event_id = e.id and r.user_id = $1
       where e.status in ('published','live')
       order by ai_score desc, e.trending_score desc
       limit 20`,
      [req.user!.id]
    );
    res.json({ recommendations: rows });
  } catch (error) {
    next(error);
  }
});
