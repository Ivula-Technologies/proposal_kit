"use client";

import { useMemo, useState } from "react";
import { FileText } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProposalCard } from "@/components/shared/ProposalCard";
import { NewProposalButton } from "@/components/shared/NewProposalButton";
import type { Proposal, ProposalStatus } from "@/types";

const FILTERS: { label: string; value: ProposalStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Viewed", value: "viewed" },
  { label: "Signed", value: "signed" },
];

export function DashboardClient({
  initialProposals,
}: {
  initialProposals: Proposal[];
}) {
  const [filter, setFilter] = useState<ProposalStatus | "all">("all");

  const filtered = useMemo(
    () =>
      filter === "all"
        ? initialProposals
        : initialProposals.filter((p) => p.status === filter),
    [initialProposals, filter]
  );

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Proposals</h1>
          <p className="text-sm text-neutral-muted">
            {initialProposals.length} total
          </p>
        </div>
        <NewProposalButton />
      </div>

      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as ProposalStatus | "all")}
        className="mb-6"
      >
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-border py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-light">
            <FileText className="h-8 w-8 text-brand-cyan" />
          </div>
          <h2 className="text-lg font-semibold text-brand-navy">
            {initialProposals.length === 0
              ? "No proposals yet"
              : "Nothing here yet"}
          </h2>
          <p className="mb-4 max-w-sm text-sm text-neutral-muted">
            {initialProposals.length === 0
              ? "Create your first proposal to start sending professional, signable documents to your clients."
              : "Try a different status filter."}
          </p>
          {initialProposals.length === 0 && <NewProposalButton />}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </div>
      )}
    </div>
  );
}
