import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function formatDeposit(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

/**
 * Optional platform fee on client deposits, in basis points (100 = 1%).
 * Defaults to 0: the freelancer keeps the whole deposit minus Stripe's own
 * processing fee.
 */
export function platformFeeFor(amountCents: number) {
  const bps = Number(process.env.PLATFORM_FEE_BPS ?? 0);
  if (!Number.isFinite(bps) || bps <= 0) return 0;
  return Math.floor((amountCents * Math.min(bps, 1000)) / 10_000);
}
