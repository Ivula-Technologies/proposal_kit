# ProposalKit system design

ProposalKit is built for one person to run. There is one Node app on cPanel, plus four managed services: Supabase (database, login, file storage), Stripe (payments), Resend (email) and GitHub (code, builds, backups). There are no queues, workers or extra servers to look after.

```
client browser ──> cPanel Node app (Next.js) ──> Supabase (Postgres + Auth + Storage)
                         │        │
                         │        └──> Resend (emails)
                         └──> Stripe (subscriptions + client deposits)
                              Stripe ──webhooks──> /api/webhooks/stripe
cPanel cron (daily) ──> /api/cron/daily      UptimeRobot ──> /api/health
GitHub Actions: build package on every push, weekly encrypted DB backup
```

## What keeps it reliable

| Risk | What handles it |
| --- | --- |
| Client double-clicks Pay, or opens two tabs | The open Stripe Checkout for a deposit is reused (`proposals.deposit_checkout_session`), so only one payment can start. |
| Stripe sends a webhook twice, or we crash halfway | Webhook updates only change rows that aren't already paid (`deposit_paid = false`), and only the update that flipped it sends the email. A failure returns 500, so Stripe retries for up to 3 days. |
| Two people sign at once | Signing claims the proposal in one conditional update. The second signer gets "already signed". |
| Sender edits after the client opened the page | Signing checks a content fingerprint and asks the client to reload. |
| Spam or abuse on public pages | Per-IP limits on signing, responding, checkout and view tracking (`lib/rate-limit.ts`). Proposal ids are unguessable UUIDs. |
| A user reading someone else's data | Row Level Security on every table. Writes go through API routes that check ownership and plan limits. |
| Something breaks and nobody notices | Errors are stored in `app_events`. The daily cron emails `ADMIN_EMAIL` a digest on days with errors. `/api/health` returns 503 when settings are missing, the database is down, or the daily cron has not run for 26 hours. UptimeRobot watches it. |
| Losing the database | A weekly encrypted backup runs in GitHub Actions and is kept 90 days. Supabase also keeps its own daily backups on paid plans. |
| A bad deploy | Uploads are manual zips. Keep the previous zip, and re-upload it to roll back. `schema.sql` only adds things, so it is safe to re-run. |

Growth path, when it's needed: Supabase Pro ($25/mo) adds daily backups and point-in-time restore. If the app ever runs on more than one server, move the rate limiter to Supabase or Redis. Neither is needed at today's size.

## Your one-time setup

1. **cPanel env var** `ADMIN_EMAIL`: where the daily error digest goes.
2. **UptimeRobot** (free): an HTTP monitor on `https://<your app>/api/health`, every 5 minutes, alerting your email.
3. **GitHub secrets** (repo Settings > Secrets and variables > Actions):
   - `SUPABASE_DB_URL`: Supabase > Project Settings > Database > Connection string > Session pooler, with your database password filled in.
   - `BACKUP_PASSPHRASE`: any long passphrase. Save it in your password manager; without it a backup can't be opened.

   Then run **Actions > Back up database** once by hand to check it works.
4. Re-run `supabase/schema.sql` after each upgrade.

## Restoring a backup

1. Download the newest `proposalkit-db-backup` artifact from **Actions > Back up database**.
2. Decrypt it: `gpg -d proposalkit-YYYY-MM-DD.sql.gz.gpg | gunzip > backup.sql` (it asks for `BACKUP_PASSPHRASE`).
3. Create a new Supabase project, then run `psql "<new project connection string>" -f backup.sql`.
4. Point the app's Supabase env vars at the new project and restart.

Signature images live in Supabase Storage and aren't in the database dump. Every signed PDF is also emailed to you when it's signed, so you keep a copy.

## Testing changes safely (staging)

Use Stripe **test mode** keys and a second free Supabase project on your own computer (`npm run dev` with a `.env.local`). Then push. GitHub runs lint, type checks and tests on every push before you upload anything. Test card: `4242 4242 4242 4242`.
