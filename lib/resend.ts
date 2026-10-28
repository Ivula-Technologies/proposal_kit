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

export function emailConfigured() {
  return !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM_EMAIL;
}

// "Acme Studio <proposals@yourdomain.com>": the freelancer's name on the
// verified ProposalKit sending address.
function senderAs(from: string, name: string | null) {
  if (!name) return from;
  return `${name.replace(/["<>]/g, "")} <${from.replace(/^.*<|>$/g, "")}>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:28px 0;"><a href="${escapeHtml(href)}" style="background:#0F1A3E; color:#ffffff; padding:12px 22px; border-radius:6px; text-decoration:none; font-weight:600; display:inline-block;">${escapeHtml(label)}</a></p>`;

const paragraph = (html: string) =>
  `<p style="color:#1A1F2E; line-height:1.6;">${html}</p>`;

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
    recipientLabel === "client" ? senderAs(from, businessName) : from;

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

/** Plain-text transactional email (trial reminders). Returns null when email isn't configured. */
export async function sendPlainEmail({
  to,
  subject,
  text,
  replyTo,
}: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string | null;
}) {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !from) return null;
  const { data, error } = await getResend().emails.send({
    from,
    to,
    replyTo: replyTo ?? undefined,
    subject,
    text,
  });
  if (error) throw new Error(error.message);
  return data;
}

/** The proposal link, emailed to the client from the freelancer's name. */
export async function sendProposalToClient({
  to,
  clientName,
  proposalTitle,
  proposalUrl,
  senderName,
  message,
  depositLabel,
  replyTo,
}: {
  to: string;
  clientName: string | null;
  proposalTitle: string;
  proposalUrl: string;
  senderName: string;
  message: string | null;
  depositLabel: string | null;
  replyTo: string | null;
}) {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !from) return null;

  const greeting = clientName ? `Hi ${escapeHtml(clientName)},` : "Hi,";
  const note = message
    ? escapeHtml(message).replace(/\n/g, "<br />")
    : `Here's my proposal for <strong>${escapeHtml(proposalTitle)}</strong>. You can read it on any device and sign it online in about a minute. No account needed.`;
  const deposit = depositLabel
    ? paragraph(`After you sign, you can pay the ${escapeHtml(depositLabel)} deposit by card to book the project.`)
    : "";

  const body = `
    ${paragraph(greeting)}
    ${paragraph(note)}
    ${button(proposalUrl, "Review and sign")}
    ${deposit}
    ${paragraph(`Questions? Just reply to this email.<br />${escapeHtml(senderName)}`)}
  `;

  const { data, error } = await getResend().emails.send({
    from: senderAs(from, senderName),
    to,
    replyTo: replyTo ?? undefined,
    subject: `Proposal: ${proposalTitle}`,
    html: emailShell(senderName, proposalTitle, body),
  });
  if (error) throw new Error(error.message);
  return data;
}

/** Tells the freelancer something happened on a proposal (opened, deposit paid). */
export async function sendOwnerNotice({
  to,
  subject,
  title,
  lines,
  linkUrl,
  linkLabel,
}: {
  to: string;
  subject: string;
  title: string;
  lines: string[];
  linkUrl: string;
  linkLabel: string;
}) {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !from) return null;
  const body = lines.map((line) => paragraph(escapeHtml(line))).join("") + button(linkUrl, linkLabel);
  const { data, error } = await getResend().emails.send({
    from,
    to,
    subject,
    html: emailShell("ProposalKit", title, body),
  });
  if (error) throw new Error(error.message);
  return data;
}

/** Automatic follow-up to a client who hasn't signed yet, from the freelancer's name. */
export async function sendClientReminder({
  to,
  clientName,
  proposalTitle,
  proposalUrl,
  senderName,
  replyTo,
  reminderNumber,
  opened,
  validUntil,
}: {
  to: string;
  clientName: string | null;
  proposalTitle: string;
  proposalUrl: string;
  senderName: string;
  replyTo: string | null;
  reminderNumber: number;
  opened: boolean;
  validUntil: string | null;
}) {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !from) return null;

  const title = `<strong>${escapeHtml(proposalTitle)}</strong>`;
  const greeting = clientName ? `Hi ${escapeHtml(clientName)},` : "Hi,";
  const note =
    reminderNumber > 1
      ? `One last quick note on my proposal for ${title}. If the timing isn't right, just reply and let me know. If it is, you can sign online in about a minute.`
      : opened
        ? `Following up on my proposal for ${title}. Happy to answer questions or adjust anything before you sign.`
        : `Just making sure my proposal for ${title} reached you. You can read it on any device and sign online in about a minute. No account needed.`;
  const expiry = validUntil
    ? paragraph(`The proposal is valid until ${escapeHtml(validUntil)}.`)
    : "";

  const body = `
    ${paragraph(greeting)}
    ${paragraph(note)}
    ${button(proposalUrl, "Review and sign")}
    ${expiry}
    ${paragraph(`Thanks,<br />${escapeHtml(senderName)}`)}
  `;

  const { data, error } = await getResend().emails.send({
    from: senderAs(from, senderName),
    to,
    replyTo: replyTo ?? undefined,
    subject: `Following up: ${proposalTitle}`,
    html: emailShell(senderName, proposalTitle, body),
  });
  if (error) throw new Error(error.message);
  return data;
}
