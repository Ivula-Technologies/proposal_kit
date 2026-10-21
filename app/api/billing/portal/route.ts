import { NextResponse } from "next/server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { appUrl } from "@/lib/billing";

export const runtime = "nodejs";

// Stripe customer portal: change plan, update card, cancel, invoices.
export async function POST(request: Request) {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await createServiceClient()
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "No billing account yet" }, { status: 400 });
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl(request)}/settings`,
  });

  return NextResponse.json({ url: session.url });
}
