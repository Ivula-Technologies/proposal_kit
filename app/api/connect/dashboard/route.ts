import { NextResponse } from "next/server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { appUrl } from "@/lib/billing";

export const runtime = "nodejs";

// Opens the freelancer's Stripe Express dashboard (payouts, bank details).
export async function GET(request: Request) {
  const base = appUrl(request);
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${base}/login?next=/settings`, 303);
  }

  const { data: profile } = await createServiceClient()
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.stripe_account_id) {
    return NextResponse.redirect(`${base}/api/connect/onboard`, 303);
  }

  try {
    const login = await getStripe().accounts.createLoginLink(
      profile.stripe_account_id
    );
    return NextResponse.redirect(login.url, 303);
  } catch {
    // Login links only work once onboarding is complete.
    return NextResponse.redirect(`${base}/api/connect/onboard`, 303);
  }
}
