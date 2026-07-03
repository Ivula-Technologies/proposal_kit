import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend() {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@proposalkit.app";

const emailShell = (title: string, bodyHtml: string) => `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto;">
  <div style="background:#0F1A3E; padding: 24px 32px; border-radius: 8px 8px 0 0;">
    <span style="color:#00C2FF; font-weight:700; font-size:18px;">ProposalKit</span>
  </div>
  <div style="border: 1px solid #E2E6EC; border-top: none; padding: 32px; border-radius: 0 0 8px 8px;">
    <h1 style="color:#0F1A3E; font-size:20px; margin-top:0;">${title}</h1>
    ${bodyHtml}
  </div>
</div>
`;

interface SendSignedProposalEmailArgs {
  to: string;
  proposalTitle: string;
  recipientLabel: "client" | "consultant";
  pdfBuffer: Buffer;
}

export async function sendSignedProposalEmail({
  to,
  proposalTitle,
  recipientLabel,
  pdfBuffer,
}: SendSignedProposalEmailArgs) {
  const body =
    recipientLabel === "client"
      ? `<p style="color:#1A1F2E; line-height:1.6;">Thanks for signing <strong>${proposalTitle}</strong>. A copy of the signed document is attached for your records.</p>`
      : `<p style="color:#1A1F2E; line-height:1.6;"><strong>${proposalTitle}</strong> was just signed by your client. A copy of the signed document is attached.</p>`;

  return getResend().emails.send({
    from: FROM,
    to,
    subject: `${proposalTitle} — Signed copy`,
    html: emailShell("Your proposal has been signed", body),
    attachments: [
      {
        filename: `${proposalTitle.replace(/[^a-z0-9]+/gi, "-")}-signed.pdf`,
        content: pdfBuffer,
      },
    ],
  });
}
