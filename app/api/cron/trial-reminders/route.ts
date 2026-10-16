import { createServiceClient } from "@/lib/supabase/server";
import { appUrl, PLANS } from "@/lib/billing";
import { sendPlainEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";

// GET /api/cron/trial-reminders - run once a day from a cPanel cron job:
//   curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://proposalkit.ivulatechnologies.com/api/cron/trial-reminders
// Emails people on the free trial three days before it ends and on the day
// it ends. Each trial end falls into a 24-hour window exactly once, so a
// daily run sends each reminder once without storing anything.
const DAY = 86_400_000;
const LIVE = new Set(["active", "trialing", "past_due"]);

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = Date.now();
  const windows = [
    { kind: "three_days" as const, from: now + 2 * DAY, to: now + 3 * DAY },
    { kind: "ended" as const, from: now - DAY, to: now },
  ];

  const settingsUrl = `${appUrl(request)}/settings#billing`;
  let sent = 0;
  const errors: string[] = [];

  for (const w of windows) {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, subscription_status")
      .gt("trial_ends_at", new Date(w.from).toISOString())
      .lte("trial_ends_at", new Date(w.to).toISOString());
    if (error) {
      errors.push(error.message);
      continue;
    }

    for (const profile of profiles ?? []) {
      if (!profile.email) continue;
      if (profile.subscription_status && LIVE.has(profile.subscription_status)) continue;

      const { count: total } = await supabase
        .from("proposals")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id);
      const { count: signed } = await supabase
        .from("proposals")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("status", "signed");

      const proof = signed
        ? `So far ${signed} of your ${total} proposal${total === 1 ? "" : "s"} ${signed === 1 ? "has" : "have"} been signed through ProposalKit.`
        : total
          ? `You've created ${total} proposal${total === 1 ? "" : "s"} so far. Send one link and your client can sign and pay the deposit from their phone.`
          : "Create your first proposal from a template and send the link. Your client signs and pays the deposit in one place.";

      const greeting = profile.full_name ? `Hi ${profile.full_name.split(" ")[0]},` : "Hi,";
      const subject =
        w.kind === "three_days"
          ? "Your ProposalKit trial ends in 3 days"
          : "Your ProposalKit trial has ended";
      const text = [
        greeting,
        "",
        w.kind === "three_days"
          ? "Your free ProposalKit trial ends in 3 days. Pick a plan now and you won't be charged until the trial is over."
          : "Your free ProposalKit trial ended today. Links you already sent still work, but you can't create or edit proposals until you pick a plan.",
        "",
        proof,
        "",
        `Solo is ${PLANS.solo.priceLabel} for ${PLANS.solo.monthlyProposals} new proposals a month; Pro is ${PLANS.pro.priceLabel} for unlimited proposals and no ProposalKit footer. Choose here:`,
        settingsUrl,
        "",
        "Questions? Just reply to this email.",
        "",
        "ProposalKit",
      ].join("\n");

      try {
        const result = await sendPlainEmail({
          to: profile.email,
          subject,
          text,
          replyTo: process.env.SUPPORT_EMAIL || null,
        });
        if (result) sent++;
        else errors.push(`${profile.id}: email not configured`);
      } catch (err) {
        errors.push(`${profile.id}: ${err instanceof Error ? err.message : "send failed"}`);
      }
    }
  }

  return Response.json({ sent, errors }, { status: errors.length ? 207 : 200 });
}
