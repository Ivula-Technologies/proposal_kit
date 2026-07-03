import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";
import { renderProposalToPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const proposalId = searchParams.get("proposalId");

  if (!proposalId) {
    return NextResponse.json({ error: "proposalId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: proposal, error: proposalError } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (proposalError || !proposal) {
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
    const { data: signed } = await supabase.storage
      .from("signatures")
      .createSignedUrl(signature.signature_url, 3600);
    signatureImageUrl = signed?.signedUrl ?? null;
  }

  const pdfBuffer = await renderProposalToPdf({
    proposal,
    signature: signature ?? null,
    signatureImageUrl,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${proposal.title.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
