import type { SupabaseClient } from "@supabase/supabase-js";

import { loadEntitlement, type Entitlement } from "@/lib/billing";
import { formatDay, REMINDER_DAYS, reminderDue } from "@/lib/followups";
import { sendClientReminder } from "@/lib/resend";
import type { Profile } from "@/types";

const DAY = 86_400_000;

// Follows up with clients who were emailed a proposal and haven't signed:
// on day 3 and day 7 after the last send, from the freelancer's name. Each
// reminder is claimed by bumping reminders_sent first, so overlapping runs
// can't send it twice; a failed send gives the claim back for tomorrow.
export async function runClientReminders(supabase: SupabaseClient, baseUrl: string, now = new Date()) {
  let sent = 0;
  const errors: string[] = [];

  const { data: due, error } = await supabase
    .from("proposals")
    .select("id, user_id, title, client_name, client_email, status, viewed_at, sent_at, auto_remind, reminders_sent, expires_on")
    .eq("auto_remind", true)
    .in("status", ["sent", "viewed"])
    .not("client_email", "is", null)
    .lt("reminders_sent", REMINDER_DAYS.length)
    .lte("sent_at", new Date(now.getTime() - REMINDER_DAYS[0] * DAY).toISOString())
    .order("sent_at", { ascending: true })
    .limit(500);
  if (error) return { sent, errors: [error.message] };

  const owners = new Map<string, { profile: Profile | null; entitlement: Entitlement }>();

  for (const proposal of due ?? []) {
    if (!reminderDue(proposal, now)) continue;

    let owner = owners.get(proposal.user_id);
    if (!owner) {
      owner = await loadEntitlement(supabase, proposal.user_id);
      owners.set(proposal.user_id, owner);
    }
    // Follow-ups are part of the paid product; a lapsed account stops them.
    if (!owner.entitlement.canEdit) continue;

    const done = proposal.reminders_sent ?? 0;
    const { data: claimed } = await supabase
      .from("proposals")
      .update({ reminders_sent: done + 1 })
      .eq("id", proposal.id)
      .eq("reminders_sent", done)
      .in("status", ["sent", "viewed"])
      .select("id");
    if (!claimed?.length) continue;

    const profile = owner.profile;
    try {
      const result = await sendClientReminder({
        to: proposal.client_email!,
        clientName: proposal.client_name,
        proposalTitle: proposal.title,
        proposalUrl: `${baseUrl}/p/${proposal.id}`,
        senderName: profile?.business_name || profile?.full_name || "Your consultant",
        replyTo: profile?.email ?? null,
        reminderNumber: done + 1,
        opened: !!proposal.viewed_at,
        validUntil: proposal.expires_on ? formatDay(proposal.expires_on) : null,
      });
      if (!result) throw new Error("email not configured");
      sent++;
    } catch (err) {
      await supabase
        .from("proposals")
        .update({ reminders_sent: done })
        .eq("id", proposal.id)
        .eq("reminders_sent", done + 1);
      errors.push(`${proposal.id}: ${err instanceof Error ? err.message : "send failed"}`);
    }
  }

  return { sent, errors };
}
