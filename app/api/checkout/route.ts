import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";
import { getStripe, platformFeeFor } from "@/lib/stripe";
import { appUrl } from "@/lib/billing";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { reportError } from "@/lib/ops";
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

  // Reuse the checkout already started for this deposit, so a double click,
  // a second tab or a retry can't open two payments for the same deposit.
  if (proposal.deposit_checkout_session) {
    try {
      const existing = await getStripe().checkout.sessions.retrieve(
        proposal.deposit_checkout_session,
        { expand: ["payment_intent"] }
      );
      if (
        existing.status === "open" &&
        existing.amount_total === proposal.deposit_amount &&
        existing.url
      ) {
        return NextResponse.json({ url: existing.url });
      }
      if (existing.status === "open") {
        // The deposit changed since this checkout started: close the old one.
        await getStripe().checkout.sessions.expire(existing.id).catch(() => {});
      }
      if (existing.status === "complete") {
        // A bank payment can finish checkout as "unpaid" and settle days later,
        // so only a payment that failed lets the client start a new one.
        const intent =
          typeof existing.payment_intent === "object" ? existing.payment_intent : null;
        const paid =
          existing.payment_status === "paid" ||
          existing.payment_status === "no_payment_required";
        const failed =
          !paid &&
          (intent?.status === "requires_payment_method" || intent?.status === "canceled");
        if (!failed) {
          return NextResponse.json(
            {
              error: paid
                ? "This deposit has been paid. It can take a minute to show here."
                : "A payment for this deposit is already processing. It will show here once the bank confirms it.",
            },
            { status: 409 }
          );
        }
      }
    } catch (err) {
      // Expired or unknown: start a fresh one below.
      console.warn("Couldn't reuse deposit checkout", err);
    }
  }

  const base = appUrl(request);
  const fee = platformFeeFor(proposal.deposit_amount);

  let session;
  try {
    // Two clicks at the same moment both see no stored session; the same
    // idempotency key makes Stripe hand both of them the same checkout.
    const idempotencyKey = [
      "deposit",
      proposal.id,
      proposal.deposit_amount,
      proposal.deposit_checkout_session ?? "first",
    ].join(":");
    session = await getStripe().checkout.sessions.create({
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
    }, { idempotencyKey });
  } catch (err) {
    await reportError("checkout", err, `proposal ${proposal.id}`);
    return NextResponse.json(
      { error: "Card payment isn't available right now. Please try again in a few minutes." },
      { status: 502 }
    );
  }

  await supabase
    .from("proposals")
    .update({ deposit_checkout_session: session.id })
    .eq("id", proposal.id);

  return NextResponse.json({ url: session.url });
}
