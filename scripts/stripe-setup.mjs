// Creates the ProposalKit product, its two monthly prices and both
// webhooks (platform + Connect) in Stripe, then prints the env vars to
// paste into cPanel.
//
//   STRIPE_SECRET_KEY=sk_test_... APP_URL=https://proposalkit.ivulatechnologies.com \
//     node scripts/stripe-setup.mjs
//
// Refuses live keys unless --live is passed. Safe to re-run: it reuses the
// product, prices and webhooks it finds instead of creating duplicates.
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
const appUrl = (process.env.APP_URL || "https://proposalkit.ivulatechnologies.com").replace(/\/$/, "");
const live = process.argv.includes("--live");

if (!key) {
  console.error("Set STRIPE_SECRET_KEY first.");
  process.exit(1);
}
if (key.startsWith("sk_live") && !live) {
  console.error("This is a live key. Re-run with --live if you really mean to create live objects.");
  process.exit(1);
}

const stripe = new Stripe(key);

const PLANS = [
  { lookup: "proposalkit_solo_monthly", nickname: "Solo", amount: 2900, env: "STRIPE_PRICE_SOLO" },
  { lookup: "proposalkit_pro_monthly", nickname: "Pro", amount: 5900, env: "STRIPE_PRICE_PRO" },
];

const PLATFORM_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_failed",
];
const CONNECT_EVENTS = ["account.updated"];

const existing = await stripe.products.search({ query: "metadata['app']:'proposalkit'" });
const product =
  existing.data[0] ??
  (await stripe.products.create({ name: "ProposalKit", metadata: { app: "proposalkit" } }));

const out = {};
for (const plan of PLANS) {
  const found = await stripe.prices.list({ lookup_keys: [plan.lookup], active: true });
  const price =
    found.data[0] ??
    (await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: plan.amount,
      recurring: { interval: "month" },
      nickname: plan.nickname,
      lookup_key: plan.lookup,
    }));
  out[plan.env] = price.id;
}

const webhookUrl = `${appUrl}/api/webhooks/stripe`;
const hooks = await stripe.webhookEndpoints.list({ limit: 100 });
const reused = "(already exists; copy its signing secret from the Stripe dashboard)";

async function ensureHook(connect, events, envName) {
  const kind = connect ? "connect" : "platform";
  const match = hooks.data.find((h) => h.url === webhookUrl && h.metadata?.kind === kind);
  if (match) {
    // Keep an existing endpoint's event list current when this script grows.
    await stripe.webhookEndpoints.update(match.id, { enabled_events: events });
    out[envName] = reused;
    return;
  }
  const hook = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: events,
    connect,
    metadata: { kind },
  });
  out[envName] = hook.secret;
}

await ensureHook(false, PLATFORM_EVENTS, "STRIPE_WEBHOOK_SECRET");
await ensureHook(true, CONNECT_EVENTS, "STRIPE_CONNECT_WEBHOOK_SECRET");

console.log(`\nStripe ${key.startsWith("sk_live") ? "LIVE" : "test"} setup done. Add these to cPanel:\n`);
for (const [name, value] of Object.entries(out)) console.log(`${name}=${value}`);
console.log(`
Two things the API can't do for you, both in the Stripe dashboard:
  1. Connect: open Connect > Get started, choose "Express" accounts, and
     fill in the platform profile (needed before freelancers can onboard).
  2. Settings > Billing > Customer portal: turn it on and allow cancelling
     and switching between Solo and Pro.`);
