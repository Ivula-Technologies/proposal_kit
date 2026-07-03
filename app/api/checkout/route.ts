import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { proposalId } = await request.json().catch(() => ({}));

  if (!proposalId) {
    return NextResponse.json(
      { error: "proposalId is required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data: proposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (!proposal.deposit_amount || proposal.deposit_amount <= 0) {
    return NextResponse.json(
      { error: "This proposal has no deposit" },
      { status: 400 }
    );
  }
  if (proposal.deposit_paid) {
    return NextResponse.json(
      { error: "Deposit already paid" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: proposal.deposit_amount,
          product_data: {
            name: `Deposit — ${proposal.title}`,
          },
        },
      },
    ],
    customer_email: proposal.client_email ?? undefined,
    metadata: { proposal_id: proposal.id },
    success_url: `${appUrl}/p/${proposal.id}?deposit=success`,
    cancel_url: `${appUrl}/p/${proposal.id}?deposit=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
