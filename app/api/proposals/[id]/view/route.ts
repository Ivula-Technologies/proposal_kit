import { NextResponse } from "next/server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/billing";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sendOwnerNotice } from "@/lib/resend";
import { isUuid } from "@/lib/validate";

export const runtime = "nodejs";

// POST /api/proposals/[id]/view - sent by the client's proposal page once it
// has loaded in a real browser. Recording the first open here, rather than
// when the page is rendered, means email link scanners (Outlook Safe Links,
// Gmail, Slack and iMessage previews) don't mark a proposal as opened or
// email the sender before the client has looked at it.
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!rateLimit(`view:${clientIp(request)}`, 30, 10 * 60_000)) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createServiceClient();
  const { data: proposal } = await supabase
    .from("proposals")
    .select("id, user_id, title, client_name, status, viewed_at")
    .eq("id", params.id)
    .maybeSingle();
  if (!proposal || proposal.viewed_at) return NextResponse.json({ ok: true });

  // The sender previewing their own link doesn't count.
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (user?.id === proposal.user_id) return NextResponse.json({ ok: true });

  // A signed or declined proposal is never downgraded.
  const nextStatus =
    proposal.status === "signed" || proposal.status === "declined" ? proposal.status : "viewed";
  const { data: claimed } = await supabase
    .from("proposals")
    .update({ viewed_at: new Date().toISOString(), status: nextStatus })
    .eq("id", proposal.id)
    .eq("status", proposal.status)
    .is("viewed_at", null)
    .select("id");

  if (claimed?.length && nextStatus === "viewed") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", proposal.user_id)
      .maybeSingle();
    if (profile?.email) {
      const who = proposal.client_name || "Your client";
      try {
        await sendOwnerNotice({
          to: profile.email,
          subject: `${who} opened "${proposal.title}"`,
          title: "Your proposal was just opened",
          lines: [
            `${who} opened "${proposal.title}". This is a good moment to follow up while it's fresh.`,
            "You'll get another email as soon as they sign.",
          ],
          linkUrl: `${appUrl()}/editor/${proposal.id}`,
          linkLabel: "Open the proposal",
        });
      } catch (err) {
        console.error("Failed to send viewed notice", err);
      }
    }
  }
  return NextResponse.json({ ok: true });
}
