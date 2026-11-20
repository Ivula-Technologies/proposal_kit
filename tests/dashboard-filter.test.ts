import { describe, expect, it } from "vitest";

import {
  applyDashboardFilter,
  dashboardHref,
  parseDashboardFilter,
  safeBackHref,
} from "@/lib/dashboard-filter";
import type { Proposal } from "@/types";

const p = (over: Partial<Proposal>) =>
  ({
    id: Math.random().toString(36),
    title: "Website redesign",
    client_name: "Acme Co",
    client_email: "ops@acme.test",
    status: "draft",
    deposit_paid: false,
    ...over,
  }) as Proposal;

describe("dashboard filter", () => {
  const list = [
    p({ status: "sent" }),
    p({ status: "viewed", client_name: "Beta LLC" }),
    p({ status: "signed", deposit_paid: true, title: "Logo" }),
    p({ status: "draft", client_name: " acme co " }),
  ];

  it("reads the URL and ignores unknown values", () => {
    expect(parseDashboardFilter({ show: "waiting", client: "Acme", q: "logo" })).toEqual({
      show: "waiting",
      client: "Acme",
      q: "logo",
    });
    expect(parseDashboardFilter({ show: "nope" }).show).toBe("all");
    expect(parseDashboardFilter({ show: ["paid", "x"] }).show).toBe("paid");
  });

  it("builds links that round-trip", () => {
    expect(dashboardHref({ show: "all" })).toBe("/dashboard");
    const href = dashboardHref({ show: "paid", client: "Acme & Sons" });
    const params = Object.fromEntries(new URL(href, "https://x.test").searchParams);
    expect(parseDashboardFilter(params)).toEqual({ show: "paid", client: "Acme & Sons", q: "" });
  });

  it("filters waiting, paid, client and search", () => {
    const f = (show: string, client = "", q = "") =>
      applyDashboardFilter(list, parseDashboardFilter({ show, client, q })).length;
    expect(f("waiting")).toBe(2);
    expect(f("paid")).toBe(1);
    expect(f("all", "ACME CO")).toBe(3);
    expect(f("all", "", "logo")).toBe(1);
    expect(f("all", "", "beta")).toBe(1);
  });

  it("only goes back to the dashboard", () => {
    expect(safeBackHref("/dashboard?show=paid")).toBe("/dashboard?show=paid");
    expect(safeBackHref("https://evil.test")).toBe("/dashboard");
    expect(safeBackHref("//evil.test")).toBe("/dashboard");
    expect(safeBackHref(undefined)).toBe("/dashboard");
  });
});
