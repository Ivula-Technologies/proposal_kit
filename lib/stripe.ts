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
 * The application fee taken from each client deposit.
 *
 * Deposits are destination charges, and on a destination charge Stripe
 * bills its processing fee to the platform (ProposalKit), not to the
 * freelancer. So the fee always recovers Stripe's card fee (2.9% + 30¢ for
 * US cards by default; set STRIPE_FEE_BPS / STRIPE_FEE_FIXED_CENTS if your
 * Stripe pricing differs), and the freelancer ends up with what any card
 * payment would leave them. PLATFORM_FEE_BPS (default 0) adds a ProposalKit
 * cut on top, in basis points (100 = 1%).
 */
export function platformFeeFor(amountCents: number) {
  const setting = (name: string, fallback: number, max: number) => {
    const value = Number(process.env[name] ?? fallback);
    return Number.isFinite(value) && value > 0 ? Math.min(value, max) : 0;
  };
  const stripeBps = setting("STRIPE_FEE_BPS", 290, 1000);
  const stripeFixed = setting("STRIPE_FEE_FIXED_CENTS", 30, 500);
  const platformBps = setting("PLATFORM_FEE_BPS", 0, 1000);

  const fee =
    Math.ceil((amountCents * stripeBps) / 10_000) +
    stripeFixed +
    Math.floor((amountCents * platformBps) / 10_000);
  // Never take the whole deposit (Stripe's $0.50 minimum keeps this sane).
  return Math.min(fee, amountCents - 1);
}

/** What the freelancer receives from a deposit, after fees. */
export function depositNetFor(amountCents: number) {
  return amountCents - platformFeeFor(amountCents);
}
