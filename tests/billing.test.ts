import { describe, expect, it } from "vitest";

import { computeEntitlement, TRIAL_DAYS } from "@/lib/billing";

const DAY = 86_400_000;
const now = Date.parse("2026-10-21T12:00:00Z");
const profile = (overrides: Record<string, unknown> = {}) => ({
  plan: null,
  subscription_status: null,
  trial_ends_at: null,
  created_at: new Date(now - DAY).toISOString(),
  ...overrides,
});

describe("computeEntitlement", () => {
  it("gives a new account an unlimited trial with branding", () => {
    const e = computeEntitlement(profile() as never, 0, now);
    expect(e.state).toBe("trial");
    expect(e.canCreate).toBe(true);
    expect(e.canEdit).toBe(true);
    expect(e.trialDaysLeft).toBe(TRIAL_DAYS - 1);
    expect(e.showBranding).toBe(true);
  });

  it("locks editing once the trial has ended with no plan", () => {
    const e = computeEntitlement(
      profile({ trial_ends_at: new Date(now - 1000).toISOString() }) as never,
      0,
      now
    );
    expect(e.state).toBe("trial_ended");
    expect(e.canEdit).toBe(false);
    expect(e.canCreate).toBe(false);
  });

  it("says inactive (not trial ended) after a canceled plan", () => {
    const e = computeEntitlement(
      profile({
        plan: "solo",
        subscription_status: "canceled",
        trial_ends_at: new Date(now - DAY).toISOString(),
      }) as never,
      0,
      now
    );
    expect(e.state).toBe("inactive");
    expect(e.canEdit).toBe(false);
  });

  it("caps Solo at 10 proposals a month", () => {
    const solo = profile({ plan: "solo", subscription_status: "active" });
    expect(computeEntitlement(solo as never, 9, now).canCreate).toBe(true);
    expect(computeEntitlement(solo as never, 10, now).canCreate).toBe(false);
    expect(computeEntitlement(solo as never, 10, now).canEdit).toBe(true);
  });

  it("keeps access while a card payment is past due", () => {
    const e = computeEntitlement(
      profile({ plan: "pro", subscription_status: "past_due" }) as never,
      500,
      now
    );
    expect(e.state).toBe("active");
    expect(e.canCreate).toBe(true);
    expect(e.showBranding).toBe(false);
  });
});
