import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { appUrl, isPlan, PLANS } from "@/lib/billing";

export const runtime = "nodejs";

// Starts a ProposalKit subscription (Solo or Pro) in Stripe Checkout.
export async function POST(request: Request) {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan } = await request.json().catch(() => ({}));
  if (!isPlan(plan)) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }
  const priceId = PLANS[plan].priceId;
  if (!priceId) {
    return NextResponse.json(
      { error: "Plans aren't available yet" },
      { status: 503 }
    );
  }

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, stripe_customer_id, subscription_status, trial_ends_at")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profile?.subscription_status &&
    ["active", "trialing", "past_due"].includes(profile.subscription_status)
  ) {
    return NextResponse.json(
      { error: "You already have a plan. Use Manage billing to change it." },
      { status: 409 }
    );
  }

  const stripe = getStripe();
  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create(
      {
        email: profile?.email ?? user.email ?? undefined,
        metadata: { user_id: user.id },
      },
      { idempotencyKey: `customer-${user.id}` }
    );
    customerId = customer.id;
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  // Picking a plan mid-trial doesn't cut the trial short: the first charge
  // happens when the free trial would have ended. Stripe needs a trial end
  // at least 48 hours away, so in the trial's last two days we round up to
  // that minimum rather than charging straight away.
  const now = Math.floor(Date.now() / 1000);
  // 10-minute window: repeated clicks inside it reuse the same session.
  const bucket = Math.floor(now / 600);
  const trialEnd = profile?.trial_ends_at
    ? Math.floor(new Date(profile.trial_ends_at).getTime() / 1000)
    : 0;
  const minTrialEnd = (bucket + 1) * 600 + 48 * 3600;
  const subscriptionTrialEnd =
    trialEnd > now ? Math.max(trialEnd, minTrialEnd) : null;

  // Only one checkout can be payable at a time, so a second tab or a
  // double-click can't start a second subscription.
  const open = await stripe.checkout.sessions.list({
    customer: customerId,
    status: "open",
    limit: 10,
  });

  const base = appUrl(request);
  let session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        client_reference_id: user.id,
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        subscription_data: {
          metadata: { user_id: user.id },
          ...(subscriptionTrialEnd ? { trial_end: subscriptionTrialEnd } : {}),
        },
        metadata: { user_id: user.id, kind: "subscription" },
        success_url: `${base}/settings?billing=success`,
        cancel_url: `${base}/settings?billing=cancelled`,
      },
      // Repeated clicks for the same plan in the same window return the
      // same session; switching plans expires the earlier one below.
      { idempotencyKey: `subscription-checkout-${user.id}-${plan}-${bucket}` }
    );
  } catch (err) {
    if (err instanceof Stripe.errors.StripeIdempotencyError) {
      return NextResponse.json(
        { error: "A checkout is already in progress. Try again in a few minutes." },
        { status: 409 }
      );
    }
    throw err;
  }

  await Promise.all(
    open.data
      .filter((s) => s.id !== session.id)
      .map((s) => stripe.checkout.sessions.expire(s.id).catch(() => null))
  );

  return NextResponse.json({ url: session.url });
}
