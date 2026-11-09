import { describe, expect, it } from "vitest";
import { generateHTML } from "@tiptap/html/server";
import StarterKit from "@tiptap/starter-kit";

import { applySelection, defaultSelection, money, sanitizeItems, tableTotal } from "@/lib/pricing";
import { PricingTable } from "@/lib/tiptap/pricing-table";

const items = [
  { id: "a", name: "Design", quantity: 1, unitPrice: 250000 },
  { id: "b", name: "Hours", quantity: 7.5, unitPrice: 12000 },
  { id: "c", name: "Care plan", quantity: 1, unitPrice: 9900, optional: true, selected: true },
  { id: "d", name: "Rush", quantity: 1, unitPrice: 50000, optional: true, selected: false },
];
const doc = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "Hi" }] },
    { type: "pricingTable", attrs: { items } },
  ],
};

describe("pricing", () => {
  it("cleans untrusted items", () => {
    const clean = sanitizeItems([
      { id: "x<script>", name: "A", quantity: -3, unitPrice: 1e15 },
      { id: "x<script>", name: "B", quantity: "2", unitPrice: "150" },
      "junk",
    ]);
    expect(clean).toHaveLength(2);
    expect(clean[0].id).toBe("xscript");
    expect(clean[0].quantity).toBe(0);
    expect(clean[0].unitPrice).toBe(1_000_000_000);
    expect(clean[1].id).not.toBe("xscript"); // duplicate ids get a fresh one
    expect(clean[1].quantity).toBe(2);
    expect(clean[1].selected).toBe(true); // required items are always included
  });

  it("totals required items plus selected add-ons", () => {
    const clean = sanitizeItems(items);
    expect(tableTotal(clean)).toBe(250000 + 90000 + 9900);
    expect(tableTotal(clean, new Set(["d"]))).toBe(250000 + 90000 + 50000);
    expect(defaultSelection(doc)).toEqual(new Set(["c"]));
  });

  it("bakes the client's choice into the signed document", () => {
    const { content, total } = applySelection(doc, ["d", "a", "nope"]);
    expect(total).toBe(250000 + 90000 + 50000);
    const signed = sanitizeItems(content.content![1].attrs!.items);
    expect(signed.find((i) => i.id === "c")!.selected).toBe(false);
    expect(signed.find((i) => i.id === "d")!.selected).toBe(true);
    expect(applySelection({ type: "doc", content: [] }, []).total).toBeNull();
  });

  it("renders a static table on the server for the PDF", () => {
    const html = generateHTML(applySelection(doc, []).content, [StarterKit, PricingTable]);
    expect(html).toContain("data-pricing-table");
    expect(html).toContain("Optional, not included");
    expect(html).toContain(money(340000)); // total without add-ons
  });

  it("formats whole and partial dollars", () => {
    expect(money(250000)).toBe("$2,500");
    expect(money(6250)).toBe("$62.50");
  });
});
