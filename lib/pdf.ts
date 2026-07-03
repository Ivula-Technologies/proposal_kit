import { generateHTML } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import type { JSONContent } from "@tiptap/core";

import type { Proposal, Signature } from "@/types";

async function getBrowser() {
  const puppeteer = (await import("puppeteer-core")).default;
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (isServerless) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (!executablePath) {
    throw new Error(
      "PUPPETEER_EXECUTABLE_PATH is not set. Point it at a local Chrome/Chromium binary to generate PDFs in development."
    );
  }
  return puppeteer.launch({ executablePath, headless: true });
}

function buildProposalHtml({
  proposal,
  signature,
  signatureImageUrl,
}: {
  proposal: Proposal;
  signature: Signature | null;
  signatureImageUrl: string | null;
}) {
  const contentHtml = proposal.content
    ? generateHTML(proposal.content as JSONContent, [StarterKit, Image])
    : "<p></p>";

  const signedDate = signature
    ? new Date(signature.signed_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1A1F2E;
    margin: 0;
    padding: 48px 56px;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid #0F1A3E;
    padding-bottom: 16px;
    margin-bottom: 32px;
  }
  .brand { color: #0F1A3E; font-weight: 700; font-size: 18px; }
  .brand span { color: #00C2FF; }
  h1 { color: #0F1A3E; font-size: 26px; margin: 0 0 4px; }
  .meta { color: #8A95A5; font-size: 13px; margin-bottom: 24px; }
  .content h1, .content h2 { color: #0F1A3E; }
  .content { font-size: 14px; line-height: 1.7; }
  .signature-block {
    margin-top: 48px;
    padding-top: 24px;
    border-top: 1px solid #E2E6EC;
  }
  .signature-block h3 { color: #0F1A3E; font-size: 14px; margin-bottom: 12px; }
  .signature-image { max-height: 100px; max-width: 320px; display: block; margin-bottom: 8px; }
  .signer-name { font-weight: 600; }
  .signed-date { color: #8A95A5; font-size: 12px; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">Proposal<span>Kit</span></div>
  </div>

  <h1>${proposal.title}</h1>
  ${proposal.client_name ? `<div class="meta">Prepared for ${proposal.client_name}</div>` : ""}

  <div class="content">${contentHtml}</div>

  ${
    signature
      ? `<div class="signature-block">
          <h3>Signed</h3>
          ${signatureImageUrl ? `<img class="signature-image" src="${signatureImageUrl}" />` : ""}
          <div class="signer-name">${signature.signer_name}</div>
          <div class="signed-date">${signedDate}</div>
        </div>`
      : ""
  }
</body>
</html>
`;
}

export async function renderProposalToPdf(args: {
  proposal: Proposal;
  signature: Signature | null;
  signatureImageUrl: string | null;
}): Promise<Buffer> {
  const html = buildProposalHtml(args);

  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "a4",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
