import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { appUrl, planFromPriceId } from "@/lib/billing";
import { sendOwnerNotice } from "@/lib/resend";
import { formatUsd } from "@/lib/format";
import { syncConnectedAccount } from "@/lib/connect";

export const runtime = "nodejs";

// One endpoint for two Stripe webhooks:
//  - the platform webhook (deposits paid, ProposalKit subscriptions), signed
//    with STRIPE_WEBHOOK_SECRET
//  - the Connect webhook (freelancer account status), signed with
//    STRIPE_CONNECT_WEBHOOK_SECRET
function verify(rawBody: string, signature: string): Stripe.Event | null {
  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
  ].filter((s): s is string => !!s);

  for (const secret of secrets) {
    try {
      return getStripe().webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      // try the next secret
    }
  }
  return null;
}

async function syncSubscription(
  incoming: Stripe.Subscription,
  fallbackUserId?: string | null
) {
  // Events can arrive out of order, so always read the current state.
  const subscription = await getStripe().subscriptions.retrieve(incoming.id);
  const supabase = createServiceClient();
  const priceId = subscription.items.data[0]?.price?.id;
  const plan = planFromPriceId(priceId);
  const ended = subscription.status === "canceled" || subscription.status === "incomplete_expired";
  const periodEnd = subscription.items.data[0]?.current_period_end;

  const fields = {
    subscription_id: subscription.id,
    subscription_status: subscription.status,
    plan: ended ? null : plan,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  };

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const userId = subscription.metadata?.user_id || fallbackUserId;

  const { error } = userId
    ? await supabase
        .from("profiles")
        .update({ ...fields, stripe_customer_id: customerId })
        .eq("id", userId)
    : await supabase.from("profiles").update(fields).eq("stripe_customer_id", customerId);
  if (error) throw new Error(`profile sync failed: ${error.message}`);
}

async function notifyDepositPaid(proposal: {
  id: string;
  title: string;
  client_name: string | null;
  user_id: string;
  deposit_amount: number | null;
}) {
  try {
    const { data: owner } = await createServiceClient()
      .from("profiles")
      .select("email")
      .eq("id", proposal.user_id)
      .maybeSingle();
    if (!owner?.email) return;
    const amount = formatUsd(proposal.deposit_amount ?? 0);
    const who = proposal.client_name || "Your client";
    await sendOwnerNotice({
      to: owner.email,
      subject: `${who} paid the ${amount} deposit`,
      title: "Deposit received",
      lines: [
        `${who} paid the ${amount} deposit for "${proposal.title}".`,
        "Stripe pays it out to your bank on your normal payout schedule. Time to schedule the kickoff.",
      ],
      linkUrl: `${appUrl()}/editor/${proposal.id}`,
      linkLabel: "Open the proposal",
    });
  } catch (err) {
    // The deposit is already recorded; a missed email isn't worth a retry.
    console.error("Failed to send deposit notice", err);
  }
}

function idOf(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }
  const event = verify(rawBody, signature);
  if (!event) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    await handle(event);
  } catch (err) {
    // A 500 makes Stripe retry the event (with backoff, for up to 3 days),
    // so a temporary database problem can't lose a paid deposit or plan.
    console.error(`Stripe webhook ${event.type} ${event.id} failed`, err);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handle(event: Stripe.Event) {
  const supabase = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === "payment") {
        const proposalId = session.metadata?.proposal_id;
        if (proposalId && session.payment_status === "paid") {
          const { data: paid, error } = await supabase
            .from("proposals")
            .update({
              deposit_paid: true,
              deposit_paid_at: new Date().toISOString(),
              deposit_payment_intent: idOf(session.payment_intent),
            })
            .eq("id", proposalId)
            .eq("deposit_paid", false)
            .select("id, title, client_name, user_id, deposit_amount");
          if (error) throw new Error(`deposit update failed: ${error.message}`);
          // Only the event that flipped it notifies, so retries don't repeat it.
          if (paid?.[0]) await notifyDepositPaid(paid[0]);
        }
      }

      const subscriptionId = idOf(session.subscription);
      if (session.mode === "subscription" && subscriptionId) {
        await syncSubscription(
          { id: subscriptionId } as Stripe.Subscription,
          session.client_reference_id
        );
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;

    case "invoice.payment_failed":
    case "invoice.paid": {
      // Moves the plan to past_due (and back) as soon as Stripe knows.
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = idOf(invoice.parent?.subscription_details?.subscription);
      if (subscriptionId) {
        await syncSubscription({ id: subscriptionId } as Stripe.Subscription);
      }
      break;
    }

    case "account.updated":
      await syncConnectedAccount(supabase, event.data.object as Stripe.Account);
      break;
  }
}
