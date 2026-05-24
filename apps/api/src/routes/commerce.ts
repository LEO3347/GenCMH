import { createHmac } from "crypto";
import { Router } from "express";
import { z } from "zod";
import { pool, tx } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { createSecureQr, hashToken, renderQrDataUrl } from "../services/qr.js";
import { config } from "../config.js";

export const commerceRouter = Router();

interface ProductRow {
  id: string;
  event_id: string;
  name: string;
  price_cents: number;
  currency: string;
  stock: number;
  pickup_zone: string;
}

function pickupCode() {
  return `GEN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function payloadHash(input: unknown) {
  return createHmac("sha256", config.qrSigningSecret).update(JSON.stringify(input)).digest("hex");
}

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(20)
});

const orderSchema = z.object({
  eventId: z.string().uuid(),
  clientOrderId: z.string().min(8).max(120),
  deviceId: z.string().min(4).max(120),
  offlineCreatedAt: z.string().datetime().optional(),
  items: z.array(orderItemSchema).min(1).max(30)
});

const syncSchema = z.object({
  deviceId: z.string().min(4).max(120),
  eventId: z.string().uuid().optional(),
  orders: z.array(orderSchema).max(100)
});

commerceRouter.get("/events/:eventId/products", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `select id, event_id, name, description, category, image_url, price_cents, currency, stock, pickup_zone
       from products
       where event_id = $1 and active = true
       order by category, name`,
      [req.params.eventId]
    );
    res.json({ products: rows, offlineReady: true });
  } catch (error) {
    next(error);
  }
});

commerceRouter.get("/offline-manifest", requireAuth, async (_req, res, next) => {
  try {
    const [events, products] = await Promise.all([
      pool.query(
        `select id, title, slug, venue_name, city, starts_at, cover_url, vip, trending_score
         from event_cards order by starts_at asc limit 30`
      ),
      pool.query(
        `select id, event_id, name, description, category, image_url, price_cents, currency, stock, pickup_zone
         from products where active = true order by created_at desc limit 300`
      )
    ]);
    res.json({
      generatedAt: new Date().toISOString(),
      events: events.rows,
      products: products.rows,
      policy: {
        chatEnabledForUsers: false,
        localNetworkMode: true,
        syncTarget: "/api/commerce/sync"
      }
    });
  } catch (error) {
    next(error);
  }
});

async function createPickupOrder(userId: string, input: z.infer<typeof orderSchema>) {
  return tx(async (client) => {
    const ids = input.items.map((item) => item.productId);
    const { rows: productRows } = await client.query<ProductRow>(
      `select id, event_id, name, price_cents, currency, stock, pickup_zone
       from products where event_id = $1 and id = any($2::uuid[]) and active = true for update`,
      [input.eventId, ids]
    );

    const productMap = new Map<string, ProductRow>(productRows.map((row) => [row.id, row]));
    let total = 0;
    let pickupZone = productRows[0]?.pickup_zone ?? "Bar Express";

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) throw new Error("product_not_found");
      if (product.stock < item.quantity) throw new Error("insufficient_stock");
      total += product.price_cents * item.quantity;
      pickupZone = product.pickup_zone;
    }

    const merchant = await client.query(
      `select ma.id from merchant_accounts ma
       join events e on e.organizer_id = ma.owner_user_id
       where e.id = $1 and ma.active = true
       order by ma.created_at asc limit 1`,
      [input.eventId]
    );

    const order = await client.query(
      `insert into pickup_orders (
        event_id, user_id, merchant_account_id, client_order_id, status, total_cents,
        pickup_code, pickup_qr_token_hash, pickup_zone, source_device_id, offline_created_at, synced_at
       )
       values ($1,$2,$3,$4,'pending_payment',$5,$6,$7,$8,$9,$10,now())
       on conflict (user_id, client_order_id)
       do update set synced_at = now()
       returning *`,
      [
        input.eventId,
        userId,
        merchant.rows[0]?.id ?? null,
        input.clientOrderId,
        total,
        pickupCode(),
        hashToken(`${userId}:${input.clientOrderId}`),
        pickupZone,
        input.deviceId,
        input.offlineCreatedAt ?? null
      ]
    );

    const createdOrder = order.rows[0];
    await client.query("delete from pickup_order_items where order_id = $1", [createdOrder.id]);

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) throw new Error("product_not_found");
      const lineTotal = product.price_cents * item.quantity;
      await client.query(
        `insert into pickup_order_items (order_id, product_id, quantity, unit_price_cents, total_cents)
         values ($1,$2,$3,$4,$5)`,
        [createdOrder.id, item.productId, item.quantity, product.price_cents, lineTotal]
      );
      await client.query("update products set stock = stock - $1, updated_at = now() where id = $2", [item.quantity, item.productId]);
    }

    const token = createSecureQr(
      {
        ticketId: createdOrder.id,
        eventId: input.eventId,
        userId,
        purpose: "pickup",
        orderId: createdOrder.id
      },
      60 * 60 * 24
    );
    await client.query("update pickup_orders set pickup_qr_token_hash = $1 where id = $2", [hashToken(token), createdOrder.id]);

    await client.query(
      `insert into payments (user_id, provider, amount_cents, currency, status, metadata)
       values ($1, 'stripe', $2, 'MXN', 'pending', $3)`,
      [userId, total, { pickupOrderId: createdOrder.id, centralSettlement: true }]
    );

    await client.query(
      `insert into purchases (user_id, event_id, purchase_type, reference_id, amount_cents, status)
       values ($1,$2,'pickup',$3,$4,'pending')`,
      [userId, input.eventId, createdOrder.id, total]
    );

    return { order: { ...createdOrder, pickup_qr_token_hash: undefined }, token };
  });
}

commerceRouter.post("/orders", requireAuth, async (req, res, next) => {
  try {
    const input = orderSchema.parse(req.body);
    const result = await createPickupOrder(req.user!.id, input);
    res.status(201).json({
      order: result.order,
      pickupQr: {
        token: result.token,
        image: await renderQrDataUrl(result.token)
      }
    });
  } catch (error) {
    next(error);
  }
});

commerceRouter.post("/sync", requireAuth, async (req, res, next) => {
  try {
    const input = syncSchema.parse(req.body);
    const hash = payloadHash(input);
    const accepted = [];
    const rejected = [];

    for (const order of input.orders) {
      try {
        accepted.push(await createPickupOrder(req.user!.id, order));
      } catch (error) {
        rejected.push({ clientOrderId: order.clientOrderId, reason: error instanceof Error ? error.message : "sync_error" });
      }
    }

    await pool.query(
      `insert into offline_sync_batches (device_id, user_id, event_id, payload_hash, accepted_count, rejected_count, metadata)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (device_id, payload_hash) do nothing`,
      [input.deviceId, req.user!.id, input.eventId ?? null, hash, accepted.length, rejected.length, { rejected }]
    );

    res.json({
      syncedAt: new Date().toISOString(),
      accepted: await Promise.all(
        accepted.map(async (item) => ({
          order: item.order,
          pickupQr: { token: item.token, image: await renderQrDataUrl(item.token) }
        }))
      ),
      rejected
    });
  } catch (error) {
    next(error);
  }
});

commerceRouter.get("/orders/mine", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `select po.*, e.title as event_title
       from pickup_orders po
       join events e on e.id = po.event_id
       where po.user_id = $1
       order by po.created_at desc limit 50`,
      [req.user!.id]
    );
    res.json({ orders: rows });
  } catch (error) {
    next(error);
  }
});
