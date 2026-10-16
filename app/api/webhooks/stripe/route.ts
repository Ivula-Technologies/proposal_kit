import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { planFromPriceId } from "@/lib/billing";
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

  if (userId) {
    await supabase
      .from("profiles")
      .update({ ...fields, stripe_customer_id: customerId })
      .eq("id", userId);
  } else {
    await supabase.from("profiles").update(fields).eq("stripe_customer_id", customerId);
  }
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

  const supabase = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === "payment") {
        const proposalId = session.metadata?.proposal_id;
        if (proposalId && session.payment_status === "paid") {
          await supabase
            .from("proposals")
            .update({
              deposit_paid: true,
              deposit_paid_at: new Date().toISOString(),
              deposit_payment_intent:
                typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : session.payment_intent?.id ?? null,
            })
            .eq("id", proposalId);
        }
      }

      if (session.mode === "subscription" && session.subscription) {
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
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
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;

    case "account.updated":
      await syncConnectedAccount(supabase, event.data.object as Stripe.Account);
      break;
  }

  return NextResponse.json({ received: true });
}
