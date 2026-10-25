import type { Metadata } from "next";

import { LegalPage } from "@/components/shared/LegalPage";

export const metadata: Metadata = {
  title: "Delete your account",
  description: "How to delete your ProposalKit account and its data.",
};

const REQUEST = `mailto:hello@ivulatechnologies.com?subject=${encodeURIComponent(
  "Delete my ProposalKit account"
)}&body=${encodeURIComponent("Please delete my ProposalKit account and all of its proposals.\n")}`;

// Linked from Settings and from the Google Play listing, which requires a page
// where people can ask for their account to be deleted without the app.
export default function DeleteAccountPage() {
  return (
    <LegalPage title="Delete your account" updated="October 25, 2026">
      <p>
        You can ask us to delete your ProposalKit account at any time. Send the request from the email address you sign
        in with, so we know it&apos;s you:
      </p>
      <p>
        <a href={REQUEST}>Email hello@ivulatechnologies.com to delete my account</a>
      </p>

      <h2>What happens</h2>
      <ul>
        <li>
          We confirm by email and delete your account, proposals, signatures and business details within 30 days,
          usually within 2 working days. Download any signed PDFs you want to keep first.
        </li>
        <li>Any active subscription is cancelled first, so you are not charged again.</li>
        <li>
          Deposits your clients already paid stay in your own Stripe account. We keep billing records (invoices and
          payments) for as long as tax law requires, and nothing else.
        </li>
      </ul>
    </LegalPage>
  );
}
