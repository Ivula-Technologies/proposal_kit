import type { Proposal, ProposalStatus } from "@/types";

// What the dashboard list shows. Kept in the URL (/dashboard?show=waiting)
// so every box and link can open the exact list it talks about, and the back
// button returns to it.
export type DashboardShow = ProposalStatus | "all" | "waiting" | "paid";

export interface DashboardFilter {
  show: DashboardShow;
  client: string;
  q: string;
}

const SHOWS: DashboardShow[] = [
  "all",
  "draft",
  "sent",
  "viewed",
  "signed",
  "declined",
  "waiting",
  "paid",
];

export const SHOW_LABELS: Record<DashboardShow, string> = {
  all: "All",
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  signed: "Signed",
  declined: "Declined",
  waiting: "Waiting on client",
  paid: "Deposit paid",
};

function one(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function parseDashboardFilter(params: {
  [key: string]: string | string[] | undefined;
}): DashboardFilter {
  const show = one(params.show) as DashboardShow;
  return {
    show: SHOWS.includes(show) ? show : "all",
    client: one(params.client).slice(0, 200),
    q: one(params.q).slice(0, 200),
  };
}

export function dashboardHref(filter: Partial<DashboardFilter>) {
  const params = new URLSearchParams();
  if (filter.show && filter.show !== "all") params.set("show", filter.show);
  if (filter.client) params.set("client", filter.client);
  if (filter.q) params.set("q", filter.q);
  const query = params.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}

/** Only ever go "back" to a dashboard list, never to an outside address. */
export function safeBackHref(value: string | string[] | undefined) {
  const back = one(value);
  return back === "/dashboard" || back.startsWith("/dashboard?") ? back : "/dashboard";
}

export function matchesShow(p: Proposal, show: DashboardShow) {
  if (show === "all") return true;
  if (show === "waiting") return p.status === "sent" || p.status === "viewed";
  if (show === "paid") return !!p.deposit_paid;
  return p.status === show;
}

export function applyDashboardFilter(proposals: Proposal[], filter: DashboardFilter) {
  const client = filter.client.toLowerCase();
  const q = filter.q.toLowerCase();
  return proposals.filter((p) => {
    if (!matchesShow(p, filter.show)) return false;
    if (client && (p.client_name ?? "").trim().toLowerCase() !== client) return false;
    if (q) {
      const haystack = [p.title, p.client_name, p.client_email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
