import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";
import { getStripe, platformFeeFor } from "@/lib/stripe";
import { appUrl } from "@/lib/billing";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";

export const runtime = "nodejs";

// Client deposit checkout. The money goes to the freelancer's own Stripe
// Express account (destination charge); the platform never holds it.
export async function POST(request: Request) {
  if (!rateLimit(`checkout:${clientIp(request)}`, 20, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const { proposalId } = await request.json().catch(() => ({}));
  if (!isUuid(proposalId)) {
    return NextResponse.json({ error: "proposalId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: proposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", proposalId)
    .maybeSingle();

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (proposal.status !== "signed") {
    return NextResponse.json(
      { error: "Sign the proposal before paying the deposit" },
      { status: 400 }
    );
  }
  if (!proposal.deposit_amount || proposal.deposit_amount <= 0) {
    return NextResponse.json({ error: "This proposal has no deposit" }, { status: 400 });
  }
  if (proposal.deposit_paid) {
    return NextResponse.json({ error: "Deposit already paid" }, { status: 400 });
  }

  const { data: owner } = await supabase
    .from("profiles")
    .select("stripe_account_id, charges_enabled, business_name")
    .eq("id", proposal.user_id)
    .maybeSingle();

  if (!owner?.stripe_account_id || !owner.charges_enabled) {
    return NextResponse.json(
      {
        error:
          "Online payment isn't set up for this proposal yet. Please contact the sender.",
      },
      { status: 409 }
    );
  }

  const base = appUrl(request);
  const fee = platformFeeFor(proposal.deposit_amount);

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: proposal.deposit_amount,
          product_data: {
            name: `Deposit — ${proposal.title}`.slice(0, 250),
          },
        },
      },
    ],
    customer_email: proposal.client_email ?? undefined,
    metadata: { proposal_id: proposal.id, kind: "deposit" },
    payment_intent_data: {
      on_behalf_of: owner.stripe_account_id,
      transfer_data: { destination: owner.stripe_account_id },
      ...(fee > 0 ? { application_fee_amount: fee } : {}),
      metadata: { proposal_id: proposal.id, kind: "deposit" },
    },
    success_url: `${base}/p/${proposal.id}?deposit=success`,
    cancel_url: `${base}/p/${proposal.id}?deposit=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
