import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/billing";
import { isExpired } from "@/lib/followups";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sendClientResponseToOwner } from "@/lib/resend";
import { isEmail, isUuid } from "@/lib/validate";

export const runtime = "nodejs";

// POST /api/proposals/[id]/respond - public, from the client's proposal page.
//   { action: "changes", message, name?, email? }  asks the freelancer for changes
//   { action: "decline", message?, name?, email? } turns the proposal down
// Either way automatic follow-ups stop and the freelancer gets an email.
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ip = clientIp(request);
  if (!rateLimit(`respond:${ip}`, 5, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action;
  if (action !== "changes" && action !== "decline") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  const text = (value: unknown, max: number) =>
    typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
  const message = text(body.message, 2000);
  const name = text(body.name, 120);
  const email = text(body.email, 200);
  if (action === "changes" && !message) {
    return NextResponse.json({ error: "Tell them what you'd like changed" }, { status: 400 });
  }
  if (email && !isEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: proposal } = await supabase
    .from("proposals")
    .select("id, user_id, title, client_name, client_email, status, expires_on")
    .eq("id", params.id)
    .maybeSingle();
  if (!proposal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (proposal.status !== "sent" && proposal.status !== "viewed") {
    return NextResponse.json(
      {
        error:
          proposal.status === "signed"
            ? "This proposal is already signed"
            : proposal.status === "declined"
              ? "This proposal was already declined"
              : "This proposal hasn't been sent yet",
      },
      { status: 409 }
    );
  }
  if (action === "decline" && isExpired(proposal.expires_on)) {
    return NextResponse.json({ error: "This proposal has already expired" }, { status: 409 });
  }

  const updates =
    action === "decline"
      ? {
          status: "declined",
          declined_at: new Date().toISOString(),
          decline_reason: message,
          auto_remind: false,
        }
      : { auto_remind: false };
  const { data: updated, error } = await supabase
    .from("proposals")
    .update(updates)
    .eq("id", proposal.id)
    .in("status", ["sent", "viewed"])
    .select("id");
  if (error) {
    console.error("Proposal response failed", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
  if (!updated?.length) {
    return NextResponse.json({ error: "This proposal changed. Reload the page." }, { status: 409 });
  }

  const { data: owner } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", proposal.user_id)
    .maybeSingle();
  if (owner?.email) {
    try {
      await sendClientResponseToOwner({
        to: owner.email,
        action,
        proposalTitle: proposal.title,
        clientLabel: name || proposal.client_name || "Your client",
        clientEmail: email || proposal.client_email,
        message,
        editorUrl: `${appUrl(request)}/editor/${proposal.id}`,
      });
    } catch (err) {
      // The response is recorded either way; the email is a courtesy.
      console.error("Failed to email client response", err);
    }
  }

  return NextResponse.json({ ok: true, status: action === "decline" ? "declined" : proposal.status });
}
