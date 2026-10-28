import { describe, expect, it } from "vitest";

import {
  formatDay,
  isExpired,
  nextReminderAt,
  parseExpiry,
  reminderDue,
  type FollowupState,
} from "@/lib/followups";

const sent = (over: Partial<FollowupState> = {}): FollowupState => ({
  status: "sent",
  client_email: "dana@acme.com",
  sent_at: "2026-11-01T15:00:00Z",
  auto_remind: true,
  reminders_sent: 0,
  expires_on: null,
  ...over,
});

describe("expiry", () => {
  it("lets a proposal be signed through its last day everywhere", () => {
    expect(isExpired(null)).toBe(false);
    // Nov 10 is still Nov 10 at UTC-12 until noon UTC on Nov 11.
    expect(isExpired("2026-11-10", new Date("2026-11-11T11:00:00Z"))).toBe(false);
    expect(isExpired("2026-11-10", new Date("2026-11-11T12:30:00Z"))).toBe(true);
  });

  it("parses only real dates", () => {
    expect(parseExpiry("")).toBeNull();
    expect(parseExpiry(null)).toBeNull();
    expect(parseExpiry("2026-12-31")).toBe("2026-12-31");
    expect(parseExpiry("2026-02-30")).toBeUndefined();
    expect(parseExpiry("12/31/2026")).toBeUndefined();
    expect(parseExpiry(5)).toBeUndefined();
  });

  it("formats a day without shifting it", () => {
    expect(formatDay("2026-11-04")).toBe("Nov 4, 2026");
  });
});

describe("reminders", () => {
  it("schedules day 3, then day 7, then stops", () => {
    expect(nextReminderAt(sent())?.toISOString()).toBe("2026-11-04T15:00:00.000Z");
    expect(nextReminderAt(sent({ reminders_sent: 1 }))?.toISOString()).toBe("2026-11-08T15:00:00.000Z");
    expect(nextReminderAt(sent({ reminders_sent: 2 }))).toBeNull();
  });

  it("is due only once its time has come", () => {
    expect(reminderDue(sent(), new Date("2026-11-04T14:00:00Z"))).toBe(false);
    expect(reminderDue(sent(), new Date("2026-11-04T16:00:00Z"))).toBe(true);
  });

  it("skips signed, draft, unsent, turned-off and expired proposals", () => {
    const later = new Date("2026-11-20T00:00:00Z");
    expect(reminderDue(sent({ status: "signed" }), later)).toBe(false);
    expect(reminderDue(sent({ status: "draft" }), later)).toBe(false);
    expect(reminderDue(sent({ sent_at: null }), later)).toBe(false);
    expect(reminderDue(sent({ auto_remind: false }), later)).toBe(false);
    expect(reminderDue(sent({ client_email: null }), later)).toBe(false);
    expect(reminderDue(sent({ expires_on: "2026-11-02" }), later)).toBe(false);
    expect(reminderDue(sent({ status: "viewed" }), later)).toBe(true);
  });
});
