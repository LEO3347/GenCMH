import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { createExternalPaymentInstructions, createStripeCheckout } from "../services/payments.js";
import { config } from "../config.js";

export const paymentsRouter = Router();

const checkoutSchema = z.object({
  ticketId: z.string().uuid(),
  provider: z.enum(["stripe", "paypal", "mercadopago"]).default("stripe")
});

paymentsRouter.post("/checkout", requireAuth, async (req, res, next) => {
  try {
    const input = checkoutSchema.parse(req.body);
    const { rows } = await pool.query(
      `select t.id, t.price_cents, e.title
       from tickets t join events e on e.id = t.event_id
       where t.id = $1 and t.user_id = $2`,
      [input.ticketId, req.user!.id]
    );
    const ticket = rows[0];
    if (!ticket) return res.status(404).json({ error: "ticket_not_found" });

    await pool.query(
      `insert into payments (ticket_id, user_id, provider, amount_cents, currency, status)
       values ($1,$2,$3,$4,'MXN','pending')`,
      [input.ticketId, req.user!.id, input.provider, ticket.price_cents]
    );

    if (input.provider === "stripe") {
      return res.json(await createStripeCheckout({
        ticketId: input.ticketId,
        eventTitle: ticket.title,
        amountCents: ticket.price_cents,
        successUrl: `${config.webOrigin}/checkout/success`,
        cancelUrl: `${config.webOrigin}/checkout/cancel`
      }));
    }

    res.json(createExternalPaymentInstructions(input.provider));
  } catch (error) {
    next(error);
  }
});
