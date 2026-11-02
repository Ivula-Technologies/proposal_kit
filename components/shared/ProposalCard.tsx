import Link from "next/link";
import { format } from "date-fns";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { isExpired } from "@/lib/followups";
import { formatUsd } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import type { Proposal } from "@/types";

function activity(proposal: Proposal) {
  const at = (iso: string) => format(new Date(iso), "MMM d");
  if (proposal.signed_at) return `Signed ${at(proposal.signed_at)}`;
  if (proposal.declined_at) return `Declined ${at(proposal.declined_at)}`;
  if (isExpired(proposal.expires_on)) return "Expired";
  if (proposal.viewed_at) return `Opened ${at(proposal.viewed_at)}`;
  if (proposal.sent_at) return `Sent ${at(proposal.sent_at)}`;
  return `Created ${at(proposal.created_at)}`;
}

export function ProposalCard({ proposal }: { proposal: Proposal }) {
  return (
    <Link href={`/editor/${proposal.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-brand-navy">
              {proposal.title || "Untitled proposal"}
            </p>
            <p className="truncate text-sm text-neutral-muted">
              {proposal.client_name || "No client yet"}
              {proposal.deposit_amount ? (
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
    </Link>
  );
}
