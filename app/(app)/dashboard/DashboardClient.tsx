"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, FileText, Search, X } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProposalCard } from "@/components/shared/ProposalCard";
import { NewProposalButton } from "@/components/shared/NewProposalButton";
import { formatUsd } from "@/lib/format";
import {
  SHOW_LABELS,
  applyDashboardFilter,
  dashboardHref,
  type DashboardFilter,
  type DashboardShow,
} from "@/lib/dashboard-filter";
import { cn } from "@/lib/utils";
import type { Proposal } from "@/types";

const TABS: DashboardShow[] = ["all", "draft", "sent", "viewed", "signed", "declined"];

export function DashboardClient({
  initialProposals,
  initialFilter,
  hasBusinessName,
  payoutsReady,
}: {
  initialProposals: Proposal[];
  initialFilter: DashboardFilter;
  hasBusinessName: boolean;
  payoutsReady: boolean;
}) {
  const [filter, setFilterState] = useState<DashboardFilter>(initialFilter);
  const listHref = dashboardHref(filter);

  // Keep the list in the URL, so a refresh, a shared link or the editor's
  // back arrow comes back to the same list.
  function setFilter(next: Partial<DashboardFilter>) {
    const merged = { ...filter, ...next };
    setFilterState(merged);
    // Updates the address without reloading the list from the server.
    window.history.replaceState(null, "", dashboardHref(merged));
  }

  const filtered = useMemo(
    () => applyDashboardFilter(initialProposals, filter),
    [initialProposals, filter]
  );
  const narrowed = filter.show !== "all" || !!filter.client || !!filter.q;
  const latestDraft = initialProposals.find((p) => p.status === "draft");

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

  const steps: {
    done: boolean;
    label: string;
    hint: string;
    href?: string;
    action?: "new";
  }[] = [
    {
      done: hasBusinessName,
      label: "Add your business name",
      hint: "Clients see it on the proposal and in the email.",
      href: "/settings#business",
    },
    {
      done: initialProposals.length > 0,
      label: "Create your first proposal",
      hint: "Start from a template. Scope, pricing and terms are already written.",
      action: "new" as const,
    },
    {
      done: initialProposals.some((p) => p.status !== "draft"),
      label: "Send it to a client",
      hint: "Use Send to client in the editor, or copy the link.",
      href: latestDraft ? `/editor/${latestDraft.id}` : undefined,
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
                  {step.action === "new" && !step.done ? (
                    <NewProposalButton
                      variant="link"
                      className="h-auto p-0 font-medium text-brand-navy"
                    >
                      {step.label}
                    </NewProposalButton>
                  ) : step.href && !step.done ? (
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
            { show: "waiting" as const, label: "Waiting on client", value: String(stats.awaiting) },
            { show: "signed" as const, label: "Signed", value: String(stats.signed) },
            { show: "paid" as const, label: "Deposits collected", value: formatUsd(stats.collected, { whole: true }) },
          ].map((stat) => {
            const active = filter.show === stat.show;
            return (
              <button
                key={stat.label}
                type="button"
                onClick={() => setFilter({ show: active ? "all" : stat.show, client: "", q: "" })}
                aria-pressed={active}
                title={active ? "Show all proposals" : `Show ${SHOW_LABELS[stat.show].toLowerCase()}`}
                className={cn(
                  "rounded-lg border bg-white p-3 text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan sm:p-4",
                  active ? "border-brand-cyan ring-1 ring-brand-cyan" : "border-neutral-border"
                )}
              >
                <p className="text-xs text-neutral-muted">{stat.label}</p>
                <p className="mt-1 text-lg font-bold text-brand-navy sm:text-2xl">{stat.value}</p>
              </button>
            );
          })}
        </div>
      )}

      {initialProposals.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Tabs
            value={TABS.includes(filter.show) ? filter.show : ""}
            onValueChange={(v) => setFilter({ show: v as DashboardShow })}
          >
            <TabsList className="max-w-full overflow-x-auto">
              {TABS.map((value) => (
                <TabsTrigger key={value} value={value}>
                  {SHOW_LABELS[value]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <label className="relative sm:ml-auto sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-muted" />
            <input
              type="search"
              value={filter.q}
              onChange={(e) => setFilter({ q: e.target.value })}
              placeholder="Search title or client"
              aria-label="Search proposals"
              className="h-9 w-full rounded-md border border-input bg-white pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
            />
          </label>
        </div>
      )}

      {narrowed && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-neutral-muted">
          <span>
            Showing {filtered.length} of {initialProposals.length}
            {filter.show !== "all" && <> · {SHOW_LABELS[filter.show]}</>}
            {filter.client && <> · {filter.client}</>}
            {filter.q && <> · &ldquo;{filter.q}&rdquo;</>}
          </span>
          <button
            type="button"
            onClick={() => setFilter({ show: "all", client: "", q: "" })}
            className="inline-flex items-center gap-1 rounded-full border border-neutral-border bg-white px-2 py-0.5 text-xs font-medium text-brand-navy hover:bg-brand-light"
          >
            <X className="h-3 w-3" />
            Show all
          </button>
        </div>
      )}

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
              : "Nothing matches this filter. Tap Show all to see every proposal."}
          </p>
          {initialProposals.length === 0 && <NewProposalButton />}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              href={
                listHref === "/dashboard"
                  ? `/editor/${proposal.id}`
                  : `/editor/${proposal.id}?back=${encodeURIComponent(listHref)}`
              }
              onPickClient={(client) => setFilter({ show: "all", client, q: "" })}
              onPickPaid={() => setFilter({ show: "paid", client: "", q: "" })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
