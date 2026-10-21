# Deploying ProposalKit on cPanel

ProposalKit runs as a Node.js app (Next.js standalone server) under cPanel's **Setup Node.js App**. It is not a static site: signing, PDFs, payments and webhooks need a server.

Suggested address: `https://proposalkit.ivulatechnologies.com`. Replace it everywhere below if you pick another.

## 1. Supabase (once)

1. Create a Supabase project (US East is a good default).
2. SQL editor: run all of `supabase/schema.sql`. It is safe to re-run. Proposal templates are built into the app, so there's no seed step.
3. Storage: check there is a **private** bucket called `signatures` (`schema.sql` creates it).
4. Auth > URL Configuration: **Site URL** `https://proposalkit.ivulatechnologies.com`, and add `https://proposalkit.ivulatechnologies.com/auth/callback` (plus `http://localhost:3000/auth/callback` for dev) to **Redirect URLs**.
5. Auth > Providers > Google (optional, recommended): create an OAuth client in Google Cloud with the callback URL Supabase shows, paste the ID and secret into Supabase.
6. Project Settings > API: copy the URL, anon key and service-role key for step 5.

## 2. Resend (once)

Verify a sending domain (for example `ivulatechnologies.com`) and set `RESEND_FROM_EMAIL` to an address on it, e.g. `ProposalKit <proposals@ivulatechnologies.com>`. Without it, signing still works, but no emails go out (the proposal itself, the opened/signed/deposit alerts and the signed copy) and the editor only offers **Copy link**.

## 3. Stripe (once, test mode first)

One Stripe account runs both ProposalKit's own subscription and **Connect**, which pays each freelancer's client deposits straight into the freelancer's bank. ProposalKit never holds client money.

1. In the Stripe dashboard (test mode), open **Connect > Get started**, choose **Express** accounts, and complete the platform profile. Freelancers can't onboard until this is done.
2. Run the setup script with your test key:

   ```bash
   npm ci
   STRIPE_SECRET_KEY=sk_test_... APP_URL=https://proposalkit.ivulatechnologies.com node scripts/stripe-setup.mjs
   ```

   It creates (or updates) the ProposalKit product, the **Solo $29/mo** and **Pro $59/mo** prices, and two webhooks pointing at `/api/webhooks/stripe` (one for your account, one for connected accounts), then prints `STRIPE_PRICE_SOLO`, `STRIPE_PRICE_PRO`, `STRIPE_WEBHOOK_SECRET` and `STRIPE_CONNECT_WEBHOOK_SECRET`. It refuses live keys unless you add `--live`, and re-running it is safe.
3. Settings > Billing > Customer portal: turn it on, allow cancelling and switching between Solo and Pro.

By hand instead: create the product and two monthly prices; add a webhook to `https://proposalkit.ivulatechnologies.com/api/webhooks/stripe` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `invoice.payment_failed`; add a second webhook to the same URL with **Listen to events on Connected accounts** for `account.updated`.

Until the price IDs are set, the plans show "Coming soon" and everyone stays on the 14-day free trial.

Deposit fees: client deposits are destination charges, and Stripe bills the card fee on those to the platform (you), not the freelancer. So every deposit carries an application fee that recovers Stripe's US card fee, 2.9% + 30¢ by default. If your Stripe pricing is different, set `STRIPE_FEE_BPS` and `STRIPE_FEE_FIXED_CENTS`. International and Amex cards cost Stripe a little more, so a small difference stays with you. `PLATFORM_FEE_BPS` (default 0) adds a ProposalKit cut on top, in basis points. The pricing page says "ProposalKit takes no cut of your deposits", so change that copy in `app/page.tsx` if you turn it on.

## 4. Build the package

Easiest: in GitHub, set repository variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_APP_URL` (Settings > Secrets and variables > Actions > Variables; they are baked into the browser bundle), then run **Actions > Build cPanel Package** on `main` and download the `proposalkit-cpanel` artifact.

Or build locally on Linux with Node 22:

```bash
npm ci
# with the three NEXT_PUBLIC_* values exported
npm run build
mkdir -p cpanel-package/.next
cp -a .next/standalone/. cpanel-package/
cp -a .next/static cpanel-package/.next/static
cp -a public cpanel-package/public
```

## 5. cPanel

1. Upload and extract the package into a folder outside `public_html`, e.g. `~/proposalkit`.
2. **Setup Node.js App** > Create application: **Node.js 22** (the bundled Chromium needs 22.17+), mode Production, application root `proposalkit`, application URL `proposalkit.ivulatechnologies.com`, startup file `server.js`.
3. Add every variable from `.env.example` under **Environment variables** (`NEXT_PUBLIC_APP_URL` must be the https address), then restart the app.
4. Make sure SSL (AutoSSL) is active on the subdomain.
5. **Trial reminders:** cPanel > **Cron Jobs**, once a day (e.g. 15:00 server time), add:

   ```bash
   curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://proposalkit.ivulatechnologies.com/api/cron/trial-reminders > /dev/null
   ```

   It emails people on the free trial 3 days before it ends and on the day it ends. Use the same value you set as `CRON_SECRET`.
6. **Monitoring:** point UptimeRobot (free) at `https://proposalkit.ivulatechnologies.com/api/health`. It returns 200 when every setting is present and the database answers, otherwise 503 with the names of the missing settings.

**PDFs on shared hosting.** Signed PDFs use a bundled headless Chromium that unpacks into `/tmp` on first use (about 60 MB) and needs roughly 512 MB of RAM while rendering. If your plan's limits block it, signing still works and the emails link to the signed proposal instead of attaching the PDF. A host-installed Chrome can be used instead by setting `PUPPETEER_EXECUTABLE_PATH`.

## 6. Smoke test (test mode)

1. Sign in at `/login` with a magic link; you land on the dashboard on the free trial.
2. Settings > **Set up payouts with Stripe**: complete Express onboarding with Stripe's test data (SSN `000-00-0000`, routing `110000000`, account `000123456789`). Back in Settings it should say "Ready to take deposits".
3. Create a proposal from a template, set a **$1** deposit, add a client email you can read, then **Send to client**. **Preview** shows a preview banner and won't let you sign your own proposal.
4. Open the emailed link in a private window. You should get a "just opened" email. Sign and pay with `4242 4242 4242 4242`. Check: the dashboard shows Signed and Deposit paid; both inboxes get the signed copy; you get a "deposit received" email; the payment shows under the connected account in Stripe, with a 33¢ application fee (2.9% + 30¢) on the platform side.
5. Settings > **Choose Solo**, pay with the test card; the page should show Solo within a few seconds.
6. `curl -i https://proposalkit.ivulatechnologies.com/api/pdf?proposalId=00000000-0000-0000-0000-000000000000` returns **401**.

## Going live

Repeat step 3 with live keys (`--live`), including Connect's live platform profile, put the live values in cPanel, restart, and do one real $1 deposit and refund it.
