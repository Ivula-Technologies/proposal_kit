import { NextResponse } from "next/server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { renderProposalToPdf } from "@/lib/pdf";
import { loadEntitlement } from "@/lib/billing";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 30;

// Owner-only PDF download. Clients get their signed copy by email, so
// this route never launches Chromium for anonymous visitors.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const proposalId = searchParams.get("proposalId");

  if (!isUuid(proposalId)) {
    return NextResponse.json({ error: "proposalId is required" }, { status: 400 });
  }

  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!rateLimit(`pdf:${user.id}`, 20, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = createServiceClient();

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", proposalId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const { data: signature } = await supabase
    .from("signatures")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let signatureImageUrl: string | null = null;
  if (signature?.signature_url) {
    const { data: file } = await supabase.storage
      .from("signatures")
      .download(signature.signature_url);
    if (file) {
      const bytes = Buffer.from(await file.arrayBuffer());
      signatureImageUrl = `data:image/png;base64,${bytes.toString("base64")}`;
    }
  }

  const { profile, entitlement } = await loadEntitlement(supabase, user.id);

  try {
    const pdfBuffer = await renderProposalToPdf({
      proposal,
      signature: signature ?? null,
      signatureImageUrl,
      branding: {
        businessName: profile?.business_name ?? null,
        showBranding: entitlement.showBranding,
      },
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${proposal.title.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF render failed", err);
    return NextResponse.json(
      { error: "PDF generation isn't available on this server yet" },
      { status: 503 }
    );
  }
}
