import { Resend } from "resend";

import { escapeHtml } from "@/lib/validate";

let resendClient: Resend | null = null;

function getResend() {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

const emailShell = (brand: string, title: string, bodyHtml: string) => `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto;">
  <div style="background:#0F1A3E; padding: 24px 32px; border-radius: 8px 8px 0 0;">
    <span style="color:#00C2FF; font-weight:700; font-size:18px;">${escapeHtml(brand)}</span>
  </div>
  <div style="border: 1px solid #E2E6EC; border-top: none; padding: 32px; border-radius: 0 0 8px 8px;">
    <h1 style="color:#0F1A3E; font-size:20px; margin-top:0;">${escapeHtml(title)}</h1>
    ${bodyHtml}
  </div>
</div>
`;

interface SendSignedProposalEmailArgs {
  to: string;
  proposalTitle: string;
  recipientLabel: "client" | "consultant";
  // Null when the PDF couldn't be rendered; the email then links to the
  // signed proposal instead of attaching it.
  pdfBuffer: Buffer | null;
  proposalUrl: string;
  businessName: string | null;
  replyTo?: string | null;
}

export async function sendSignedProposalEmail({
  to,
  proposalTitle,
  recipientLabel,
  pdfBuffer,
  proposalUrl,
  businessName,
  replyTo,
}: SendSignedProposalEmailArgs) {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !from) {
    console.warn("RESEND_API_KEY / RESEND_FROM_EMAIL not set; skipping email");
    return null;
  }

  const title = escapeHtml(proposalTitle);
  const copyLine = pdfBuffer
    ? "A copy of the signed document is attached."
    : `You can view the signed document any time at <a href="${escapeHtml(proposalUrl)}">${escapeHtml(proposalUrl)}</a>.`;
  const body =
    recipientLabel === "client"
      ? `<p style="color:#1A1F2E; line-height:1.6;">Thanks for signing <strong>${title}</strong>. ${copyLine}</p>`
      : `<p style="color:#1A1F2E; line-height:1.6;"><strong>${title}</strong> was just signed by your client. ${copyLine}</p>`;

  const brand = businessName || "ProposalKit";
  // Show the freelancer's business as the sender name on client emails.
  const fromHeader =
    recipientLabel === "client" && businessName
      ? `${businessName.replace(/["<>]/g, "")} <${from.replace(/^.*<|>$/g, "")}>`
      : from;

  return getResend().emails.send({
    from: fromHeader,
    to,
    replyTo: replyTo ?? undefined,
    subject: `${proposalTitle} — Signed copy`,
    html: emailShell(brand, "Your proposal has been signed", body),
    attachments: pdfBuffer
      ? [
          {
            filename: `${proposalTitle.replace(/[^a-z0-9]+/gi, "-")}-signed.pdf`,
            content: pdfBuffer,
          },
        ]
      : undefined,
  });
}
