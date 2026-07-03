# ProposalKit

Proposals, contracts, and e-signatures for US freelancers and consultants —
all in one shareable link.

## Stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS + shadcn/ui
- Supabase (Postgres + Auth + Storage)
- TipTap rich text editor
- Resend for transactional email
- Puppeteer for signed-PDF generation
- Lemon Squeezy for subscription billing
- Vercel for deployment

## First-time setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** and run `supabase/schema.sql` in the SQL
   editor, followed by `supabase/seed.sql` for the default proposal
   templates.

3. **Copy the environment file** and fill in your keys:

   ```bash
   cp .env.local.example .env.local
   ```

   See the comments in `.env.local.example` for where to find each key
   (Supabase dashboard, resend.com, app.lemonsqueezy.com).

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   The app boots at [http://localhost:3000](http://localhost:3000) with a
   working login page.

### PDF generation locally

`/api/pdf` and `/api/sign` use Puppeteer to render the signed proposal PDF.
In production (Vercel) this works out of the box via `@sparticuz/chromium`.
For local development, point `PUPPETEER_EXECUTABLE_PATH` in `.env.local` at
a Chrome/Chromium binary on your machine.

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
  upgrade/                Plan upgrade / pricing page
  api/
    proposals/             CRUD for proposals
    sign/                   Handles signature submit + status update
    pdf/                    Puppeteer: render proposal to PDF
    webhooks/lemonsqueezy/  Subscription plan sync
components/
  ui/                     shadcn/ui primitives
  shared/                 ProposalCard, Editor, SignaturePad, StatusBadge, Navbar, Sidebar
lib/
  supabase/               Browser, server, and middleware Supabase clients
  resend.ts                Signed-proposal email helper
  pdf.ts                    Puppeteer PDF renderer
  lemonsqueezy.ts           Pricing tiers + webhook plan mapping
  plan.ts                   Plan enforcement (proposal limits)
types/
  index.ts                Shared TypeScript types + Supabase Database type
supabase/
  schema.sql               Tables, RLS policies, storage bucket
  seed.sql                  Default proposal templates
```

## Deploying to Vercel

1. Push this repository to GitHub.
2. In Vercel, "Add new project" and import the repo.
3. Add every key from `.env.local` as an environment variable.
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel domain.
5. Deploy — every push to `main` auto-deploys.
