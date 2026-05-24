import { Router } from "express";
import { pool, tx } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const rewardsRouter = Router();

rewardsRouter.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query("select * from rewards where user_id = $1 order by created_at desc", [req.user!.id]);
    res.json({ rewards: rows });
  } catch (error) {
    next(error);
  }
});

rewardsRouter.post("/:rewardId/claim", requireAuth, async (req, res, next) => {
  try {
    const result = await tx(async (client) => {
      const reward = await client.query("select * from rewards where id = $1 and user_id = $2 for update", [req.params.rewardId, req.user!.id]);
      if (!reward.rows[0]) throw new Error("reward_not_found");
      if (reward.rows[0].claimed_at) return reward.rows[0];
      await client.query("update rewards set claimed_at = now() where id = $1", [req.params.rewardId]);
      if (reward.rows[0].points > 0) {
        const wallet = await client.query(
          `insert into wallets (user_id, balance_cents)
           values ($1, 0)
           on conflict (user_id) do update set updated_at = now()
           returning *`,
          [req.user!.id]
        );
        await client.query(
          `insert into wallet_transactions (wallet_id, user_id, amount_cents, transaction_type, reference_type, reference_id)
           values ($1,$2,$3,'reward','reward',$4)`,
          [wallet.rows[0].id, req.user!.id, reward.rows[0].points, req.params.rewardId]
        );
      }
      return { ...reward.rows[0], claimed_at: new Date().toISOString() };
    });
    res.json({ reward: result });
  } catch (error) {
    next(error);
  }
});
