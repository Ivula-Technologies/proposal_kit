import { generateHTML } from "@tiptap/html/server";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { describe, expect, it } from "vitest";

import { BUILT_IN_TEMPLATES, builtInTemplate } from "@/lib/templates";

describe("built-in templates", () => {
  it("have unique keys and look up by key", () => {
    const keys = BUILT_IN_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(builtInTemplate("design")?.name).toBe("Design project");
    expect(builtInTemplate("nope")).toBeNull();
  });

  it("render to HTML the way the PDF does", () => {
    for (const template of BUILT_IN_TEMPLATES) {
      const html = generateHTML(template.content, [StarterKit, Image]);
      expect(html).toContain("<h2>Investment</h2>");
      expect(html).toContain("<h2>Terms</h2>");
    }
  });
});
