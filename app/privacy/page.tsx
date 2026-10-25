import type { Metadata } from "next";

import { LegalPage } from "@/components/shared/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What ProposalKit collects, why, and the choices you have.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="October 25, 2026">
      <p>
        ProposalKit is made by Ivula Technologies (&ldquo;we&rdquo;). Freelancers and consultants use it to send
        proposals their clients can sign and pay a deposit on. This page explains what we hold, why, and your choices.
        Questions go to <a href="mailto:hello@ivulatechnologies.com">hello@ivulatechnologies.com</a>.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your email address, and your name if you sign in with Google. Sign-in is
          handled by Supabase; we never see a Google password.
        </li>
        <li>
          <strong>Your business details:</strong> your name and business name, as you enter them in Settings.
        </li>
        <li>
          <strong>Proposals:</strong> what you write in them, and your clients&apos; names and email addresses.
        </li>
        <li>
          <strong>Signatures:</strong> when a client signs, the drawn signature, the typed name, the time, and the
          IP address and browser it was signed from, so the signature can be proven later.
        </li>
        <li>
          <strong>Payments:</strong> your plan and its status, and whether a client paid a deposit. Card and bank
          details go straight to Stripe and never reach our servers. Payouts go from Stripe to your own bank.
        </li>
        <li>
          <strong>Technical data:</strong> IP addresses, used briefly to limit spam and abuse.
        </li>
      </ul>

      <h2>How we use it</h2>
      <p>
        Only to run ProposalKit: to show your proposals, email signed copies to you and your client, take deposits for
        you, send account emails (such as trial reminders), and keep the service secure. We do not sell personal
        information, rent it, or use it for advertising.
      </p>

      <h2>Who processes it for us</h2>
      <ul>
        <li>Supabase (database, sign-in and file storage)</li>
        <li>Stripe (subscriptions, client deposits and payouts)</li>
        <li>Resend (email delivery)</li>
        <li>Our hosting provider, which runs the website</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        For as long as your account is open. Signed proposals are kept with the account because they are the record of
        an agreement. When you close your account we delete your data within 30 days, apart from billing records we
        must keep by law.
      </p>

      <h2>Your choices and rights</h2>
      <p>
        You can edit or delete draft proposals and your business details at any time. To get a copy of your data or
        delete your account, see <a href="/delete-account">Delete your account</a> or email us. We answer within 30 days.
        California residents have the rights described in the CCPA, and we honor them for everyone.
      </p>

      <h2>Children</h2>
      <p>ProposalKit is a business tool and is not meant for anyone under 18.</p>

      <h2>Changes</h2>
      <p>If this policy changes in a way that matters, we will email account holders before it takes effect.</p>
    </LegalPage>
  );
}
