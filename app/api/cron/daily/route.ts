import { createServiceClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/billing";
import { isCronRequest } from "@/lib/cron/auth";
import { runClientReminders } from "@/lib/cron/client-reminders";
import { runTrialReminders } from "@/lib/cron/trial-reminders";
import { markCronRun, pruneEvents, reportError, summarizeErrors } from "@/lib/ops";
import { sendOwnerNotice } from "@/lib/resend";

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
  for (const error of errors) await reportError("cron-daily", error);

  // Health checks read this to spot a cron job that stopped running.
  await markCronRun(supabase, "daily");
  const digest = await sendErrorDigest(supabase, baseUrl);
  await pruneEvents(supabase);

  return Response.json(
    { trialReminders: trial.sent, clientReminders: clients.sent, errors, errorDigest: digest },
    { status: errors.length ? 207 : 200 }
  );
}

/**
 * Emails ADMIN_EMAIL a short list of the last day's server errors, only on
 * days that had any. Returns how many errors it reported.
 */
async function sendErrorDigest(
  supabase: ReturnType<typeof createServiceClient>,
  baseUrl: string
) {
  const to = process.env.ADMIN_EMAIL;
  if (!to) return 0;
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { data } = await supabase
    .from("app_events")
    .select("source, message")
    .eq("level", "error")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = data ?? [];
  if (rows.length === 0) return 0;
  const groups = summarizeErrors(rows);
  try {
    await sendOwnerNotice({
      to,
      subject: `ProposalKit: ${rows.length} server error${rows.length === 1 ? "" : "s"} in the last day`,
      title: "Server errors in the last 24 hours",
      lines: [
        ...groups
          .slice(0, 10)
          .map((g) => `${g.source}: ${g.count}× (latest: ${g.latest.slice(0, 200)})`),
        "Full details are in the app_events table in Supabase.",
      ],
      linkUrl: `${baseUrl}/api/health`,
      linkLabel: "Check app health",
    });
  } catch (err) {
    console.error("Failed to send error digest", err);
  }
  return rows.length;
}
