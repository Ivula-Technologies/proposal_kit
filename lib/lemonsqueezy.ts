import type { Plan } from "@/types";

export interface PricingTier {
  plan: Exclude<Plan, "free">;
  name: string;
  price: string;
  checkoutUrl: string | undefined;
  featured?: boolean;
  features: string[];
}

export const PRICING_TIERS: PricingTier[] = [
  {
    plan: "solo",
    name: "Solo",
    price: "$29/mo",
    checkoutUrl: process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_SOLO,
    features: [
      "5 active proposals",
      "E-signature",
      "3 templates",
      "Open tracking",
    ],
  },
  {
    plan: "pro",
    name: "Pro",
    price: "$49/mo",
    checkoutUrl: process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_PRO,
    featured: true,
    features: [
      "Unlimited proposals",
      "Contract builder",
      "Deposit on sign",
      "Custom branding",
    ],
  },
  {
    plan: "agency",
    name: "Agency",
    price: "$99/mo",
    checkoutUrl: process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_AGENCY,
    features: [
      "5 team seats",
      "AI proposal writer",
      "Win-rate analytics",
      "Priority support",
    ],
  },
];

/**
 * Lemon Squeezy product/variant names are set by whoever creates the store
 * products — match loosely on the plan keyword so the webhook keeps working
 * even if the exact product name is tweaked later.
 */
export function resolvePlanFromProductName(
  productName: string | undefined | null
): Plan | null {
  const name = (productName ?? "").toLowerCase();
  if (name.includes("agency")) return "agency";
  if (name.includes("pro")) return "pro";
  if (name.includes("solo")) return "solo";
  return null;
}
