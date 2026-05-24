import Stripe from "stripe";
import { config } from "../config.js";

const stripe = config.stripeSecretKey ? new Stripe(config.stripeSecretKey) : null;

export async function createStripeCheckout(input: {
  ticketId: string;
  eventTitle: string;
  amountCents: number;
  successUrl: string;
  cancelUrl: string;
}) {
  if (!stripe) {
    return {
      provider: "stripe",
      mode: "mock",
      checkoutUrl: `${input.successUrl}?mockPayment=1&ticket=${input.ticketId}`
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "mxn",
          unit_amount: input.amountCents,
          product_data: { name: `GEN Ticket - ${input.eventTitle}` }
        }
      }
    ],
    metadata: { ticketId: input.ticketId }
  });

  return { provider: "stripe", checkoutUrl: session.url };
}

export function createExternalPaymentInstructions(provider: "paypal" | "mercadopago") {
  return {
    provider,
    status: "requires_provider_setup",
    message: `Configura credenciales y webhooks de ${provider} para activar cobro real.`
  };
}
