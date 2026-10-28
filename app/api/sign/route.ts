import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";
import { renderProposalToPdf } from "@/lib/pdf";
import { sendSignedProposalEmail } from "@/lib/resend";
import { appUrl, loadEntitlement } from "@/lib/billing";
import { isExpired } from "@/lib/followups";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isEmail, isUuid } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 30;

// A drawn signature PNG is typically 5–40 KB; anything far bigger is abuse.
const MAX_SIGNATURE_BYTES = 300 * 1024;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

interface SignRequestBody {
  proposalId: string;
  signerName: string;
  signerEmail?: string;
  signatureDataUrl: string;
}

export async function POST(request: Request) {
  const ipAddress = clientIp(request);
  if (!rateLimit(`sign:${ipAddress}`, 10, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as Partial<SignRequestBody>;
  const { proposalId, signatureDataUrl } = body;
  const signerName =
    typeof body.signerName === "string" ? body.signerName.trim().slice(0, 120) : "";
  const signerEmail =
    typeof body.signerEmail === "string" && body.signerEmail.trim()
      ? body.signerEmail.trim()
      : null;

  if (!isUuid(proposalId) || !signerName || typeof signatureDataUrl !== "string") {
    return NextResponse.json(
      { error: "Your name and signature are required" },
      { status: 400 }
    );
  }
  if (signerEmail && !isEmail(signerEmail)) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }

  const base64 = signatureDataUrl.replace(/^data:image\/png;base64,/, "");
  const imageBuffer = Buffer.from(base64, "base64");
  if (
    imageBuffer.length === 0 ||
    imageBuffer.length > MAX_SIGNATURE_BYTES ||
    !imageBuffer.subarray(0, 4).equals(PNG_MAGIC)
  ) {
    return NextResponse.json({ error: "Invalid signature image" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: current } = await supabase
    .from("proposals")
    .select("expires_on")
    .eq("id", proposalId)
    .maybeSingle();
  if (current && isExpired(current.expires_on)) {
    return NextResponse.json(
      { error: "This proposal has expired. Ask for an updated one." },
      { status: 410 }
    );
  }

  // Claim the proposal atomically so it can only be signed once, even if
  // the client double-clicks or two people open the link.
  const signedAt = new Date().toISOString();
  const { data: proposal } = await supabase
    .from("proposals")
    .update({ status: "signed", signed_at: signedAt })
    .eq("id", proposalId)
    .neq("status", "signed")
    .select("*")
    .maybeSingle();

  if (!proposal) {
    const { data: existing } = await supabase
      .from("proposals")
      .select("id")
      .eq("id", proposalId)
      .maybeSingle();
    return existing
      ? NextResponse.json({ error: "This proposal is already signed" }, { status: 409 })
      : NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const signatureId = randomUUID();
  const storagePath = `${proposalId}/${signatureId}.png`;

  const { error: uploadError } = await supabase.storage
    .from("signatures")
    .upload(storagePath, imageBuffer, { contentType: "image/png" });

  const { data: signature, error: signatureError } = uploadError
    ? { data: null, error: uploadError }
    : await supabase
        .from("signatures")
        .insert({
          id: signatureId,
          proposal_id: proposalId,
          signer_name: signerName,
          signer_email: signerEmail,
          signature_url: storagePath,
          ip_address: ipAddress === "unknown" ? null : ipAddress,
          user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
        })
        .select("*")
        .single();

  if (signatureError || !signature) {
    // Release the claim so the client can retry.
    await supabase
      .from("proposals")
      .update({ status: proposal.viewed_at ? "viewed" : "sent", signed_at: null })
      .eq("id", proposalId);
    if (!uploadError) {
      await supabase.storage.from("signatures").remove([storagePath]);
    }
    return NextResponse.json(
      { error: "Couldn't record your signature. Please try again." },
      { status: 500 }
    );
  }

  // Generate the PDF and email both parties. Failures here must not undo
  // the signature: if the PDF can't render, the emails link to the signed
  // proposal instead.
  try {
    const { profile, entitlement } = await loadEntitlement(supabase, proposal.user_id);
    const branding = {
      businessName: profile?.business_name ?? null,
      showBranding: entitlement.showBranding,
    };

    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await renderProposalToPdf({
        proposal,
        signature,
        signatureImageUrl: `data:image/png;base64,${imageBuffer.toString("base64")}`,
        branding,
      });
    } catch (err) {
      console.error("Failed to render signed PDF", err);
    }

    const proposalUrl = `${appUrl(request)}/p/${proposal.id}`;
    const sends: Promise<unknown>[] = [];
    if (signerEmail) {
      sends.push(
        sendSignedProposalEmail({
          to: signerEmail,
          proposalTitle: proposal.title,
          recipientLabel: "client",
          pdfBuffer,
          proposalUrl,
          businessName: branding.businessName,
          replyTo: profile?.email,
        })
      );
    }
    if (profile?.email) {
      sends.push(
        sendSignedProposalEmail({
          to: profile.email,
          proposalTitle: proposal.title,
          recipientLabel: "consultant",
          pdfBuffer,
          proposalUrl,
          businessName: branding.businessName,
          replyTo: signerEmail,
        })
      );
    }
    await Promise.all(sends);
  } catch (err) {
    console.error("Failed to send signed-proposal emails", err);
  }

  return NextResponse.json({ ok: true });
}
