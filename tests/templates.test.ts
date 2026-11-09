import { generateHTML } from "@tiptap/html/server";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { describe, expect, it } from "vitest";

import { pricingTablesIn } from "@/lib/pricing";
import { BUILT_IN_TEMPLATES, builtInTemplate } from "@/lib/templates";
import { PricingTable } from "@/lib/tiptap/pricing-table";

describe("built-in templates", () => {
  it("have unique keys and look up by key", () => {
    const keys = BUILT_IN_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(builtInTemplate("design")?.name).toBe("Design project");
    expect(builtInTemplate("nope")).toBeNull();
  });

  it("render to HTML the way the PDF does", () => {
    for (const template of BUILT_IN_TEMPLATES) {
      const html = generateHTML(template.content, [StarterKit, Image, PricingTable]);
      if (template.category === "contract") {
        expect(html).toContain("legal advice");
      } else {
        expect(html).toContain("<h2>Investment</h2>");
        expect(html).toContain("<h2>Terms</h2>");
      }
    }
  });

  it("price proposals and the service agreement with a pricing table", () => {
    for (const template of BUILT_IN_TEMPLATES) {
      if (template.key === "nda") continue;
      const tables = pricingTablesIn(template.content);
      expect(tables).toHaveLength(1);
      // Prices start at $0 so the editor's send check catches unfilled lines.
      expect(tables[0].every((item) => item.unitPrice === 0)).toBe(true);
    }
    expect(builtInTemplate("nda")?.category).toBe("contract");
  });
});
