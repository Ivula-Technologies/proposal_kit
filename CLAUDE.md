# CLAUDE.md — ProposalKit project context

## What we are building
ProposalKit is a micro-SaaS for US freelancers and consultants.
It lets them create proposals, attach contracts, collect e-signatures,
and receive a deposit — all in one shareable link.

## Tech stack
- Framework: Next.js 15 (App Router, TypeScript, React 19)
- Styling: Tailwind CSS + shadcn/ui components
- Database: Supabase (PostgreSQL + Auth + Storage)
- Email: Resend
- Payments: Stripe Billing (ProposalKit subscription) + Stripe Connect Express (client deposits paid to the freelancer)
- PDF generation: Puppeteer (@sparticuz/chromium) via a Next.js API route
- Deployment: cPanel Setup Node.js App, Next.js standalone build (see DEPLOY.md)
- Editor: TipTap (rich text block editor, open source)

## Brand tokens
- Primary: #0F1A3E (navy)
- Accent: #00C2FF (cyan)
- Background: #F8FAFC
- Text: #1A1F2E

## Key constraints
- Mobile-first, fully responsive
- Public proposal view (/p/[id]) requires NO login for the client
- All data is scoped by user_id (RLS enforced on every table)
- Keep the app to 4 screens: dashboard, editor, public view, settings (business, payouts, billing)

## MVP features (build these first, nothing else)
1. Auth — Supabase magic link + Google OAuth
2. Proposal editor — TipTap block editor with template selection
3. Public proposal view — shareable link, no login required
4. E-signature — canvas draw + typed name, stored as base64
5. Email on sign — Resend sends signed confirmation to both parties
6. Lead dashboard — list of proposals with status badges

## Phase 2 (do not build until MVP is live and tested)
- Pricing table builder inside the editor
- Contract template builder (NDA, service agreement)

## Phase 3
- AI proposal writer (Claude API) — paste a client brief, generate a full draft

## Folder structure to follow
app/, components/ui/, components/shared/, lib/supabase/,
lib/resend/, types/, and public/

## Do not do
- Do not use Pages Router
- Do not use any CSS framework other than Tailwind
- Do not create any API routes outside of app/api/
- Do not hardcode any secrets — use .env.local
