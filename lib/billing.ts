import type { SupabaseClient } from "@supabase/supabase-js";

import type { Plan, Profile } from "@/types";

export interface PlanInfo {
  key: Plan;
  name: string;
  priceLabel: string;
  // New proposals per calendar month. null = unlimited.
  monthlyProposals: number | null;
  priceId: string | undefined;
  featured?: boolean;
  features: string[];
}

// Price IDs come from env so test and live Stripe objects can be swapped
// without a code change (see scripts/stripe-setup.mjs).
export const PLANS: Record<Plan, PlanInfo> = {
  solo: {
    key: "solo",
    name: "Solo",
    priceLabel: "$29/mo",
    monthlyProposals: 10,
    priceId: process.env.STRIPE_PRICE_SOLO,
    features: [
      "10 new proposals a month",
      "E-signature with audit trail",
      "Deposits paid straight to your bank",
      "Signed PDF emailed to both sides",
    ],
  },
  pro: {
    key: "pro",
    name: "Pro",
    priceLabel: "$59/mo",
    monthlyProposals: null,
    priceId: process.env.STRIPE_PRICE_PRO,
    featured: true,
    features: [
      "Unlimited proposals",
      "Everything in Solo",
      "Your brand only (no ProposalKit footer)",
      "Priority email support",
    ],
  },
};

export const TRIAL_DAYS = 14;

// Stripe subscription statuses that still unlock the app. past_due keeps
// access while Stripe retries the card so a failed charge doesn't break
// links the freelancer has already sent.
const PAID_STATUSES = new Set(["active", "trialing", "past_due"]);

export function isPlan(value: unknown): value is Plan {
  return value === "solo" || value === "pro";
}

export function planFromPriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  for (const plan of Object.values(PLANS)) {
    if (plan.priceId && plan.priceId === priceId) return plan.key;
  }
  return null;
}

export type EntitlementState = "trial" | "active" | "trial_ended" | "inactive";

export interface Entitlement {
  state: EntitlementState;
  plan: Plan | null;
  // Can create and edit proposals right now.
  canEdit: boolean;
  // Can create one more proposal this month.
  canCreate: boolean;
  monthlyProposals: number | null;
  proposalsThisMonth: number;
  trialEndsAt: string | null;
  trialDaysLeft: number;
  // Show the "Sent with ProposalKit" footer on public pages and PDFs.
  showBranding: boolean;
}

type BillingFields = Pick<
  Profile,
  "plan" | "subscription_status" | "trial_ends_at" | "created_at"
>;

export function computeEntitlement(
  profile: BillingFields | null,
  proposalsThisMonth: number,
  now = Date.now()
): Entitlement {
  const trialEnds = profile?.trial_ends_at
    ? new Date(profile.trial_ends_at)
    : new Date(
        new Date(profile?.created_at ?? now).getTime() +
          TRIAL_DAYS * 86_400_000
      );
  const msLeft = trialEnds.getTime() - now;
  const trialDaysLeft = Math.max(0, Math.ceil(msLeft / 86_400_000));
  const plan = isPlan(profile?.plan) ? profile!.plan : null;
  const status = profile?.subscription_status ?? null;

  const base = {
    plan,
    proposalsThisMonth,
    trialEndsAt: trialEnds.toISOString(),
    trialDaysLeft,
  };

  if (plan && status && PAID_STATUSES.has(status)) {
    const cap = PLANS[plan].monthlyProposals;
    return {
      ...base,
      state: "active",
      canEdit: true,
      canCreate: cap === null || proposalsThisMonth < cap,
      monthlyProposals: cap,
      showBranding: plan !== "pro",
    };
  }

  if (msLeft > 0) {
    // The free trial gets Pro limits so people see the whole product.
    return {
      ...base,
      state: "trial",
      canEdit: true,
      canCreate: true,
      monthlyProposals: null,
      showBranding: true,
    };
  }

  return {
    ...base,
    state: status ? "inactive" : "trial_ended",
    canEdit: false,
    canCreate: false,
    monthlyProposals: 0,
    showBranding: true,
  };
}

function startOfMonthUtc(now = new Date()) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString();
}

export async function countProposalsThisMonth(
  supabase: SupabaseClient,
  userId: string
) {
  const { count } = await supabase
    .from("proposals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfMonthUtc());
  return count ?? 0;
}

export async function loadEntitlement(
  supabase: SupabaseClient,
  userId: string
): Promise<{ profile: Profile | null; entitlement: Entitlement }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle<Profile>();
  const count = await countProposalsThisMonth(supabase, userId);
  return { profile, entitlement: computeEntitlement(profile, count) };
}

export function appUrl(request?: Request) {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  const base = fromEnv || (request ? new URL(request.url).origin : "http://localhost:3000");
  return base.replace(/\/$/, "");
}

export const UPGRADE_REQUIRED = "upgrade_required";
