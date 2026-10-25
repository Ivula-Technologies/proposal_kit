import { describe, expect, it } from "vitest";

import { escapeHtml, isEmail, isUuid, safeNextPath } from "@/lib/validate";
import { formatUsd } from "@/lib/format";

describe("validate", () => {
  it("accepts real emails and UUIDs only", () => {
    expect(isEmail("dana@acme.com")).toBe(true);
    expect(isEmail("dana@acme")).toBe(false);
    expect(isEmail(42)).toBe(false);
    expect(isUuid("6f1c2a0e-3b4d-4e5f-8a9b-0c1d2e3f4a5b")).toBe(true);
    expect(isUuid("../etc/passwd")).toBe(false);
  });

  it("only allows same-site redirects", () => {
    expect(safeNextPath("/editor/abc")).toBe("/editor/abc");
    expect(safeNextPath("//evil.com")).toBe("/dashboard");
    expect(safeNextPath("https://evil.com")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.com")).toBe("/dashboard");
  });

  it("escapes HTML for emails", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;"
    );
  });

  it("formats dollars from cents", () => {
    expect(formatUsd(250_000)).toBe("$2,500.00");
    expect(formatUsd(250_050, { whole: true })).toBe("$2,501");
  });
});
