import Link from "next/link";
import { format } from "date-fns";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import type { Proposal } from "@/types";

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
                    ? `Deposit paid ($${(proposal.deposit_amount / 100).toLocaleString()})`
                    : `Deposit $${(proposal.deposit_amount / 100).toLocaleString()}`}
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <StatusBadge status={proposal.status} />
            <span className="text-xs text-neutral-muted">
              {format(new Date(proposal.created_at), "MMM d, yyyy")}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
