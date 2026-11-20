import Link from "next/link";
import { format } from "date-fns";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { isExpired } from "@/lib/followups";
import { money } from "@/lib/pricing";
import { formatUsd } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import type { Proposal } from "@/types";

function activity(proposal: Proposal) {
  const at = (iso: string) => format(new Date(iso), "MMM d");
  if (proposal.signed_at) {
    const total = typeof proposal.accepted_total === "number" ? ` · ${money(proposal.accepted_total)}` : "";
    return `Signed ${at(proposal.signed_at)}${total}`;
  }
  if (proposal.declined_at) return `Declined ${at(proposal.declined_at)}`;
  if (isExpired(proposal.expires_on)) return "Expired";
  if (proposal.viewed_at) return `Opened ${at(proposal.viewed_at)}`;
  if (proposal.sent_at) return `Sent ${at(proposal.sent_at)}`;
  return `Created ${at(proposal.created_at)}`;
}

// The whole card opens the proposal. The client name and the deposit sit on
// top of that link and narrow the list instead, so each part of the card
// leads to the data it shows.
export function ProposalCard({
  proposal,
  href,
  onPickClient,
  onPickPaid,
}: {
  proposal: Proposal;
  href: string;
  onPickClient?: (client: string) => void;
  onPickPaid?: () => void;
}) {
  const clientName = proposal.client_name?.trim();
  const chip = "relative z-10 rounded underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan";
  return (
    <Card className="relative transition-shadow focus-within:shadow-md hover:shadow-md">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="min-w-0 flex-1">
          <Link
            href={href}
            className="block truncate font-semibold text-brand-navy outline-none after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-brand-cyan"
          >
            {proposal.title || "Untitled proposal"}
          </Link>
          <p className="truncate text-sm text-neutral-muted">
            {clientName && onPickClient ? (
              <button
                type="button"
                onClick={() => onPickClient(clientName)}
                className={chip}
                title={`Show every proposal for ${clientName}`}
              >
                {clientName}
              </button>
            ) : (
              clientName || "No client yet"
            )}
            {proposal.deposit_amount ? (
              proposal.deposit_paid && onPickPaid ? (
                <button
                  type="button"
                  onClick={onPickPaid}
                  className={`${chip} ml-2 font-medium text-status-signed`}
                  title="Show every paid deposit"
                >
                  Deposit paid ({formatUsd(proposal.deposit_amount)})
                </button>
              ) : (
                <span
                  className={
                    proposal.deposit_paid
                      ? "ml-2 font-medium text-status-signed"
                      : "ml-2 text-neutral-muted"
                  }
                >
                  {proposal.deposit_paid
                    ? `Deposit paid (${formatUsd(proposal.deposit_amount)})`
                    : `Deposit ${formatUsd(proposal.deposit_amount)}`}
                </span>
              )
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatusBadge status={proposal.status} />
          <span className="text-xs text-neutral-muted">
            {activity(proposal)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
