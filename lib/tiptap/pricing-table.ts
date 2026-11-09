import { Node, mergeAttributes } from "@tiptap/core";
import type { DOMOutputSpec } from "@tiptap/pm/model";

import { lineTotal, money, PRICING_NODE, sanitizeItems, tableTotal } from "@/lib/pricing";

// The pricing table block. This file has no React in it so the server can
// render proposals (PDFs) with it; the editor and client page add an
// interactive node view on top (components/shared/PricingTableView.tsx).

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pricingTable: {
      insertPricingTable: () => ReturnType;
    };
  }
}

export const PricingTable = Node.create({
  name: PRICING_NODE,
  group: "block",
  atom: true,

  addAttributes() {
    return {
      items: {
        default: [],
        parseHTML: (el) => {
          try {
            return sanitizeItems(JSON.parse(el.getAttribute("data-items") ?? "[]"));
          } catch {
            return [];
          }
        },
        renderHTML: (attrs) => ({ "data-items": JSON.stringify(sanitizeItems(attrs.items)) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-pricing-table]" }];
  },

  // Static table for the PDF and any server-side HTML.
  renderHTML({ node, HTMLAttributes }) {
    const items = sanitizeItems(node.attrs.items);
    const rows: DOMOutputSpec[] = items.map((item) => {
      const excluded = item.optional && !item.selected;
      return [
        "tr",
        { class: excluded ? "pt-excluded" : "" },
        [
          "td",
          {},
          ["div", { class: "pt-name" }, item.name || "Item"],
          ...(item.description ? [["div", { class: "pt-desc" }, item.description] as DOMOutputSpec] : []),
          ...(item.optional
            ? [["div", { class: "pt-tag" }, excluded ? "Optional, not included" : "Optional, included"] as DOMOutputSpec]
            : []),
        ],
        ["td", { class: "pt-num" }, String(item.quantity)],
        ["td", { class: "pt-num" }, money(item.unitPrice)],
        ["td", { class: "pt-num" }, excluded ? "—" : money(lineTotal(item))],
      ];
    });
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-pricing-table": "", class: "pricing-table" }),
      [
        "table",
        {},
        [
          "thead",
          {},
          ["tr", {}, ["th", {}, "Item"], ["th", { class: "pt-num" }, "Qty"], ["th", { class: "pt-num" }, "Price"], ["th", { class: "pt-num" }, "Total"]],
        ],
        ["tbody", {}, ...rows],
        [
          "tfoot",
          {},
          ["tr", {}, ["td", { colspan: "3" }, "Total"], ["td", { class: "pt-num" }, money(tableTotal(items))]],
        ],
      ],
    ];
  },

  addCommands() {
    return {
      insertPricingTable:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              items: sanitizeItems([
                { name: "Project fee", quantity: 1, unitPrice: 0 },
                { name: "Optional add-on", quantity: 1, unitPrice: 0, optional: true, selected: false },
              ]),
            },
          }),
    };
  },
});
