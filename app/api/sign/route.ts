import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";
import { renderProposalToPdf } from "@/lib/pdf";
import { sendSignedProposalEmail } from "@/lib/resend";

export const runtime = "nodejs";
export const maxDuration = 30;

interface SignRequestBody {
  proposalId: string;
  signerName: string;
  signerEmail?: string;
  signatureDataUrl: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<SignRequestBody>;
  const { proposalId, signerName, signerEmail, signatureDataUrl } = body;

  if (!proposalId || !signerName || !signatureDataUrl) {
    return NextResponse.json(
      { error: "proposalId, signerName, and signatureDataUrl are required" },
      { status: 400 }
    );
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

  // Decode the base64 PNG (data URL prefix stripped) into a Buffer.
  const base64 = signatureDataUrl.replace(/^data:image\/png;base64,/, "");
  const imageBuffer = Buffer.from(base64, "base64");

  const signatureId = randomUUID();
  const storagePath = `${proposalId}/${signatureId}.png`;

  const { error: uploadError } = await supabase.storage
    .from("signatures")
    .upload(storagePath, imageBuffer, { contentType: "image/png" });

  if (uploadError) {
    return NextResponse.json(
      { error: "Failed to store signature" },
      { status: 500 }
    );
  }

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent");

  const { data: signature, error: signatureError } = await supabase
    .from("signatures")
    .insert({
      id: signatureId,
      proposal_id: proposalId,
      signer_name: signerName,
      signer_email: signerEmail || null,
      signature_url: storagePath,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .select("*")
    .single();

  if (signatureError || !signature) {
    return NextResponse.json(
      { error: "Failed to record signature" },
      { status: 500 }
    );
  }

  const signedAt = new Date().toISOString();
  const { data: updatedProposal } = await supabase
    .from("proposals")
    .update({ status: "signed", signed_at: signedAt })
    .eq("id", proposalId)
    .select("*")
    .single();

  const finalProposal = updatedProposal ?? { ...proposal, status: "signed" as const, signed_at: signedAt };

  // Generate the PDF and email both parties. Failures here should not block
  // the signature from being recorded — the client sees a successful sign,
  // and the PDF remains available on demand via /api/pdf.
  try {
    const { data: signedUrlData } = await supabase.storage
      .from("signatures")
      .createSignedUrl(storagePath, 3600);

    const pdfBuffer = await renderProposalToPdf({
      proposal: finalProposal,
      signature,
      signatureImageUrl: signedUrlData?.signedUrl ?? null,
    });

    const { data: consultantProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", proposal.user_id)
      .single();

    const recipients: Promise<unknown>[] = [];
    if (signerEmail) {
      recipients.push(
        sendSignedProposalEmail({
          to: signerEmail,
          proposalTitle: proposal.title,
          recipientLabel: "client",
          pdfBuffer,
        })
      );
    }
    if (consultantProfile?.email) {
      recipients.push(
        sendSignedProposalEmail({
          to: consultantProfile.email,
          proposalTitle: proposal.title,
          recipientLabel: "consultant",
          pdfBuffer,
        })
      );
    }
    await Promise.all(recipients);
  } catch (err) {
    console.error("Failed to generate/send signed PDF", err);
  }

  return NextResponse.json({ ok: true });
}
