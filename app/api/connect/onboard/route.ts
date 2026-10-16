import { NextResponse } from "next/server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { appUrl } from "@/lib/billing";

export const runtime = "nodejs";

// Starts (or resumes) Stripe Express onboarding so the freelancer can
// receive client deposits in their own bank account. Stripe also sends
// people back here (refresh_url) when an onboarding link expires.
export async function GET(request: Request) {
  const base = appUrl(request);
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${base}/login?next=/settings`, 303);
  }

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_account_id, email, business_name")
    .eq("id", user.id)
    .maybeSingle();

  const stripe = getStripe();
  let accountId = profile?.stripe_account_id ?? null;

  if (!accountId) {
    const account = await stripe.accounts.create(
      {
        type: "express",
        country: "US",
        email: profile?.email ?? user.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: profile?.business_name
          ? { name: profile.business_name }
          : undefined,
        metadata: { user_id: user.id },
      },
      // One account per user even if the button is double-clicked.
      { idempotencyKey: `connect-account-${user.id}` }
    );
    accountId = account.id;
    await supabase
      .from("profiles")
      .update({ stripe_account_id: accountId })
      .eq("id", user.id);
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${base}/api/connect/onboard`,
    return_url: `${base}/settings?payouts=return`,
  });

  return NextResponse.redirect(link.url, 303);
}
