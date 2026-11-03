import { createServiceClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/billing";
import { isCronRequest } from "@/lib/cron/auth";
import { runTrialReminders } from "@/lib/cron/trial-reminders";

export const dynamic = "force-dynamic";

// GET /api/cron/trial-reminders - trial emails only. Kept for cron jobs set
// up before /api/cron/daily, which runs these and the client follow-ups.
export async function GET(request: Request) {
  if (!isCronRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { sent, errors } = await runTrialReminders(createServiceClient(), appUrl(request));
  return Response.json({ sent, errors }, { status: errors.length ? 207 : 200 });
}
