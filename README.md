# ProposalKit

Proposals, contracts, and e-signatures for US freelancers and consultants —
all in one shareable link.

> **Going live?** Follow [DEPLOY.md](./DEPLOY.md): Supabase, Resend, Stripe
> (subscription + Connect payouts) and cPanel, step by step.

## Pricing

14-day free trial, no card. **Solo $29/mo** (10 new proposals a month) and
**Pro $59/mo** (unlimited, no ProposalKit footer). Client deposits go to the
freelancer's own Stripe Express account; ProposalKit takes no cut by default.

## Stack

- Next.js 15 (App Router, TypeScript, React 19)
- Tailwind CSS + shadcn/ui
- Supabase (Postgres + Auth + Storage)
- TipTap rich text editor
- Resend for transactional email
- Puppeteer for signed-PDF generation
- Stripe Billing for the ProposalKit subscription
- Stripe Connect (Express) so client deposits are paid to the freelancer
- cPanel (Setup Node.js App) for hosting

## First-time setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** and run `supabase/schema.sql` in the SQL
   editor. The proposal templates are built into the app
   (`lib/templates.ts`), so there's nothing to seed.

3. **Copy the environment file** and fill in your keys:

   ```bash
   cp .env.local.example .env.local
   ```

   See the comments in `.env.local.example` and DEPLOY.md for where each
   key comes from.

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   The app boots at [http://localhost:3000](http://localhost:3000) with a
   working login page.

5. **Before pushing**, run the same checks as CI:

   ```bash
   npm run lint && npx tsc --noEmit && npm test
   ```

### PDF generation locally

`/api/pdf` and `/api/sign` use Puppeteer to render the signed proposal PDF.
On Linux servers it uses the bundled `@sparticuz/chromium` (Node 22.17+).
On macOS/Windows, point `PUPPETEER_EXECUTABLE_PATH` in `.env.local` at a
Chrome/Chromium binary on your machine.

## Project structure

```
app/
  layout.tsx            Root layout
  page.tsx               Landing / marketing page
  login/                 Magic link + Google OAuth sign-in
  auth/callback/         Supabase OAuth callback handler
  (app)/                 Authenticated shell (Navbar + Sidebar)
    dashboard/            Proposal list + status dashboard
    editor/[id]/           TipTap proposal editor
  p/[id]/                 Public proposal view (no login required)
    settings/              Business name, payouts (Connect), plan and billing
  upgrade/                Redirects to Settings > billing
  api/
    proposals/             CRUD, duplicate, and Send to client (email)
    sign/                   Handles signature submit + status update
    pdf/                    Puppeteer: render proposal to PDF
    checkout/               Deposit checkout, paid to the freelancer's Connect account
    connect/                Stripe Express onboarding + payouts dashboard link
    billing/                Subscription checkout + customer portal
    webhooks/stripe/        Deposits paid, subscription sync, Connect account status
components/
  ui/                     shadcn/ui primitives
  shared/                 ProposalCard, Editor, SignaturePad, StatusBadge, Navbar, Sidebar
lib/
  supabase/               Browser, server, and middleware Supabase clients
  resend.ts                Proposal, signed-copy and owner alert emails
  templates.ts             Built-in proposal templates
  pdf.ts                    Puppeteer PDF renderer
  stripe.ts                 Stripe client + deposit application fee
  billing.ts                Plans, free trial and entitlement checks
  connect.ts                Syncs Connect account status
  rate-limit.ts, validate.ts  Public-route guards
types/
  index.ts                Shared TypeScript types + Supabase Database type
supabase/
  schema.sql               Tables, RLS policies, storage bucket (safe to re-run)
```

## Deploying

See [DEPLOY.md](./DEPLOY.md). Every push to `main` runs the **Build cPanel
Package** GitHub Action, which uploads a ready-to-extract package.
