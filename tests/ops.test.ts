import { describe, expect, it } from "vitest";

import { cronHealth, summarizeErrors } from "@/lib/ops";

describe("operations helpers", () => {
  it("flags a daily cron that stopped running", () => {
    const now = new Date("2026-11-18T12:00:00Z");
    expect(cronHealth(null, now)).toBe("never");
    expect(cronHealth(new Date("2026-11-18T03:00:00Z"), now)).toBe("ok");
    expect(cronHealth(new Date("2026-11-17T09:00:00Z"), now)).toBe("stale");
  });

  it("groups errors by where they happened, most frequent first", () => {
    const groups = summarizeErrors([
      { source: "sign", message: "a" },
      { source: "checkout", message: "b" },
      { source: "checkout", message: "c" },
    ]);
    expect(groups.map((g) => [g.source, g.count])).toEqual([
      ["checkout", 2],
      ["sign", 1],
    ]);
    expect(groups[0].latest).toBe("b");
  });
});
