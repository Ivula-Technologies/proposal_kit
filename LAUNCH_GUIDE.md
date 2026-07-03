# ProposalKit — Launch Guide

Follow these steps in order. When you finish, the app is live and able to
take payments. Budget 60–90 minutes total.

---

## 1. Supabase (database + auth + storage) — ~20 min

1. Go to [supabase.com](https://supabase.com) → **New project**.
   - Pick any region close to your customers (US East is a good default).
   - Save the database password somewhere safe.
2. When the project is ready, open **SQL Editor** and run, in order:
   - the entire contents of `supabase/schema.sql`
   - the entire contents of `supabase/seed.sql` (default proposal templates)
3. **Get your API keys**: Project Settings → API.
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server only — never
     expose this in the browser or commit it)
4. **Enable Google login** (optional but recommended):
   - Authentication → Providers → Google → Enable.
   - Create OAuth credentials at
     [console.cloud.google.com](https://console.cloud.google.com) →
     APIs & Services → Credentials → Create OAuth client ID (Web).
   - Authorized redirect URI: the "Callback URL" Supabase shows on the
     Google provider page (looks like
     `https://<project-ref>.supabase.co/auth/v1/callback`).
   - Paste the Google client ID + secret back into Supabase.
5. **Set redirect URLs**: Authentication → URL Configuration.
   - Site URL: your production domain (e.g. `https://proposalkit.vercel.app`)
   - Redirect URLs: add both
     `http://localhost:3000/auth/callback` and
     `https://<your-domain>/auth/callback`
6. **Verify the storage bucket**: Storage → you should see a `signatures`
   bucket (created by `schema.sql`). It must be **private** (public access
   off).

## 2. Stripe (client deposit payments) — ~15 min

This is how money reaches you when a client signs and pays a deposit.

1. Create an account at [stripe.com](https://stripe.com) and complete the
   business/bank details so payouts can reach your bank account.
2. **Get your secret key**: Developers → API keys.
   - Use the **test** key (`sk_test_…`) first; switch to the **live** key
     (`sk_live_…`) after you've done a test run.
   - → `STRIPE_SECRET_KEY`
3. **Create the webhook**: Developers → Webhooks → Add endpoint.
   - Endpoint URL: `https://<your-domain>/api/webhooks/stripe`
   - Events to send: `checkout.session.completed`
   - After creating, copy the **Signing secret** (`whsec_…`) →
     `STRIPE_WEBHOOK_SECRET`
4. That's it — no products to create. The app generates a Checkout session
   on the fly for whatever deposit amount you set on each proposal.

**How it works in the app:** set a deposit amount in the editor's top bar
(the `$` field). After your client signs, they immediately see a
"Pay deposit" button that sends them to Stripe Checkout. When they pay,
the webhook marks the deposit paid and your dashboard shows
"Deposit paid".

**Test it** with card number `4242 4242 4242 4242`, any future expiry,
any CVC (while using your `sk_test_` key).

## 3. Resend (signed-PDF emails) — ~10 min

1. Create an account at [resend.com](https://resend.com).
2. **Verify your domain**: Domains → Add domain → add the DNS records they
   show you at your DNS provider. (Until verified you can only send to
   your own email address.)
3. API Keys → Create API key → `RESEND_API_KEY`.
4. Set `RESEND_FROM_EMAIL` to an address on the verified domain, e.g.
   `noreply@yourdomain.com`.

## 4. Lemon Squeezy (your subscription revenue) — ~15 min

Lemon Squeezy is the Merchant of Record for your SaaS subscriptions —
they handle US sales tax so you don't need a US entity.

1. Create a store at [lemonsqueezy.com](https://lemonsqueezy.com).
2. Create **three subscription products**: Solo $29/mo, Pro $49/mo,
   Agency $99/mo. Include the plan name ("Solo", "Pro", "Agency") in each
   product's name — the webhook uses it to set the right plan.
3. Copy each product's **checkout URL** (Share → copy link) into:
   - `NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_SOLO`
   - `NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_PRO`
   - `NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_AGENCY`
4. Settings → API → create a key → `LEMONSQUEEZY_API_KEY`.
5. Settings → Webhooks → Add webhook:
   - URL: `https://<your-domain>/api/webhooks/lemonsqueezy`
   - Events: `subscription_created`, `subscription_updated`,
     `subscription_cancelled`, `subscription_expired`
   - Signing secret → `LEMONSQUEEZY_WEBHOOK_SECRET`

Customers must check out with the **same email** they use to log in to
ProposalKit — that's how the webhook matches the subscription to their
profile.

## 5. Vercel (hosting) — ~10 min

1. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import
   `Ivula-Technologies/proposal_kit` from GitHub.
2. Framework preset: Next.js (auto-detected). Leave build settings alone.
3. **Environment variables**: add every key from `.env.local.example`
   (except `PUPPETEER_EXECUTABLE_PATH`, which is local-dev only):
   - all `NEXT_PUBLIC_SUPABASE_*` + `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_WEBHOOK_SECRET`,
     all three `NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_*`
   - `NEXT_PUBLIC_APP_URL` = your Vercel URL
     (e.g. `https://proposalkit.vercel.app` — you can update this after
     the first deploy assigns the domain)
4. Deploy. Every push to the default branch auto-deploys from now on.
5. Go back and fix the "chicken and egg" URLs now that you know your
   domain:
   - `NEXT_PUBLIC_APP_URL` env var in Vercel → redeploy
   - Supabase Site URL + redirect URLs (step 1.5)
   - Stripe webhook endpoint URL (step 2.3)
   - Lemon Squeezy webhook URL (step 4.5)

> **Note on PDFs:** the Puppeteer PDF route uses `@sparticuz/chromium`
> and works on Vercel out of the box. PDF generation can take ~10s on
> cold starts — the route is capped at `maxDuration = 30`, within the
> free-tier limit for Node functions.

## 6. End-to-end smoke test — ~10 min

Run through the full money path once in test mode:

1. Log in at your production URL (magic link).
2. Create a proposal from a template, set a **$1 deposit**, save.
3. Copy the public link, open it in an incognito window.
4. Sign it (draw or type). Confirm:
   - You see the "Pay deposit" button → pay with `4242 4242 4242 4242`.
   - Both inboxes receive the signed PDF.
   - Dashboard shows the proposal as **Signed** with **Deposit paid**.
5. Switch `STRIPE_SECRET_KEY` + webhook to live keys, redeploy, and
   you're taking real money.

---

## Environment variable checklist

| Variable | From |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (server only) |
| `RESEND_API_KEY` | resend.com → API Keys |
| `RESEND_FROM_EMAIL` | Your verified domain address |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → endpoint |
| `LEMONSQUEEZY_API_KEY` | Lemon Squeezy → Settings → API |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Lemon Squeezy → Settings → Webhooks |
| `NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_SOLO/PRO/AGENCY` | Each product's checkout URL |
| `NEXT_PUBLIC_APP_URL` | Your Vercel domain |
