import { NextResponse } from "next/server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { appUrl, loadEntitlement, UPGRADE_REQUIRED } from "@/lib/billing";
import { isExpired } from "@/lib/followups";
import { formatUsd } from "@/lib/format";
import { rateLimit } from "@/lib/rate-limit";
import { emailConfigured, sendProposalToClient } from "@/lib/resend";
import { isEmail, isUuid } from "@/lib/validate";

export const runtime = "nodejs";

// Emails the proposal link to the client from the freelancer's name, with
// replies going to the freelancer. Marks a draft as sent.
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!rateLimit(`send:${user.id}`, 30, 60 * 60_000)) {
    return NextResponse.json(
      { error: "You've sent a lot of emails in the last hour. Try again later." },
      { status: 429 }
    );
  }
  if (!emailConfigured()) {
    return NextResponse.json(
      { error: "Email sending isn't set up yet. Copy the link and send it yourself." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const message =
    typeof body.message === "string" && body.message.trim()
      ? body.message.trim().slice(0, 2000)
      : null;
  // Automatic follow-ups on day 3 and 7 unless the sender turns them off.
  const remind = body.remind !== false;

  const service = createServiceClient();
  const { data: proposal } = await service
    .from("proposals")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!proposal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (proposal.status === "signed") {
    return NextResponse.json(
      { error: "This proposal is already signed" },
      { status: 409 }
    );
  }
  if (isExpired(proposal.expires_on)) {
    return NextResponse.json(
      { error: "This proposal has expired. Change its valid-until date first." },
      { status: 409 }
    );
  }
  if (!isEmail(proposal.client_email)) {
    return NextResponse.json(
      { error: "Add your client's email first" },
      { status: 400 }
    );
  }

  const { profile, entitlement } = await loadEntitlement(service, user.id);
  if (!entitlement.canEdit) {
    return NextResponse.json(
      { error: "Your free trial has ended", code: UPGRADE_REQUIRED },
      { status: 403 }
    );
  }

  const senderName =
    profile?.business_name || profile?.full_name || user.email || "Your consultant";
  const depositLabel =
    proposal.deposit_amount && profile?.charges_enabled
      ? formatUsd(proposal.deposit_amount)
      : null;

  try {
    await sendProposalToClient({
      to: proposal.client_email,
      clientName: proposal.client_name,
      proposalTitle: proposal.title,
      proposalUrl: `${appUrl(request)}/p/${proposal.id}`,
      senderName,
      message,
      depositLabel,
      replyTo: profile?.email ?? user.email ?? null,
    });
  } catch (err) {
    console.error("Failed to email proposal", err);
    return NextResponse.json(
      { error: "Couldn't send the email. Check the address, or copy the link instead." },
      { status: 502 }
    );
  }

  // Each send restarts the follow-up clock.
  const sentAt = new Date().toISOString();
  const followup = { sent_at: sentAt, reminders_sent: 0, auto_remind: remind };
  let status = proposal.status;
  const { error } = await service
    .from("proposals")
    .update(
      // Sending a declined proposal again reopens it for signing.
      status === "draft" || status === "declined"
        ? { ...followup, status: "sent", declined_at: null, decline_reason: null }
        : followup
    )
    .eq("id", proposal.id)
    .neq("status", "signed");
  if (!error && (status === "draft" || status === "declined")) status = "sent";

  return NextResponse.json({ ok: true, status, ...followup });
}
