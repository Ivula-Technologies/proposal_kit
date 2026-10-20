"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, FileText } from "lucide-react";

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

function formatUsd(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function DashboardClient({
  initialProposals,
  hasBusinessName,
  payoutsReady,
}: {
  initialProposals: Proposal[];
  hasBusinessName: boolean;
  payoutsReady: boolean;
}) {
  const [filter, setFilter] = useState<ProposalStatus | "all">("all");

  const filtered = useMemo(
    () =>
      filter === "all"
        ? initialProposals
        : initialProposals.filter((p) => p.status === filter),
    [initialProposals, filter]
  );

  const stats = useMemo(() => {
    const awaiting = initialProposals.filter(
      (p) => p.status === "sent" || p.status === "viewed"
    ).length;
    const signed = initialProposals.filter((p) => p.status === "signed").length;
    const collected = initialProposals.reduce(
      (sum, p) => sum + (p.deposit_paid ? p.deposit_amount ?? 0 : 0),
      0
    );
    return { awaiting, signed, collected };
  }, [initialProposals]);

  const steps = [
    {
      done: hasBusinessName,
      label: "Add your business name",
      hint: "Clients see it on the proposal and in the email.",
      href: "/settings",
    },
    {
      done: initialProposals.length > 0,
      label: "Create your first proposal",
      hint: "Start from a template. Scope, pricing and terms are already written.",
    },
    {
      done: initialProposals.some((p) => p.status !== "draft"),
      label: "Send it to a client",
      hint: "Use Send to client in the editor, or copy the link.",
    },
    {
      done: payoutsReady,
      label: "Get paid a deposit on signing (optional)",
      hint: "Connect your bank through Stripe. The money goes straight to you.",
      href: "/settings#payouts",
    },
  ];
  const showChecklist = steps.some((step) => !step.done);

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

      {showChecklist && (
        <div className="mb-6 rounded-lg border border-neutral-border bg-white p-4 sm:p-5">
          <h2 className="font-semibold text-brand-navy">Get your first proposal signed</h2>
          <ul className="mt-3 space-y-3">
            {steps.map((step) => (
              <li key={step.label} className="flex items-start gap-3">
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-status-signed" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-neutral-border" />
                )}
                <div className="text-sm">
                  {step.href && !step.done ? (
                    <Link href={step.href} className="font-medium text-brand-navy underline-offset-2 hover:underline">
                      {step.label}
                    </Link>
                  ) : (
                    <p className={step.done ? "text-neutral-muted line-through" : "font-medium text-brand-navy"}>
                      {step.label}
                    </p>
                  )}
                  {!step.done && <p className="text-neutral-muted">{step.hint}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {initialProposals.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: "Waiting on client", value: String(stats.awaiting) },
            { label: "Signed", value: String(stats.signed) },
            { label: "Deposits collected", value: formatUsd(stats.collected) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-neutral-border bg-white p-3 sm:p-4">
              <p className="text-xs text-neutral-muted">{stat.label}</p>
              <p className="mt-1 text-lg font-bold text-brand-navy sm:text-2xl">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as ProposalStatus | "all")}
        className="mb-6"
      >
        <TabsList className="max-w-full overflow-x-auto">
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
