import { createServiceClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/billing";
import { isCronRequest } from "@/lib/cron/auth";
import { runClientReminders } from "@/lib/cron/client-reminders";
import { runTrialReminders } from "@/lib/cron/trial-reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/cron/daily - run once a day from a cPanel cron job:
//   curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://proposalkit.ivulatechnologies.com/api/cron/daily
// Sends trial reminders to freelancers and follow-ups to their clients.
export async function GET(request: Request) {
  if (!isCronRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServiceClient();
  const baseUrl = appUrl(request);
  const trial = await runTrialReminders(supabase, baseUrl);
  const clients = await runClientReminders(supabase, baseUrl);
  const errors = [...trial.errors, ...clients.errors];
  return Response.json(
    { trialReminders: trial.sent, clientReminders: clients.sent, errors },
    { status: errors.length ? 207 : 200 }
  );
}
