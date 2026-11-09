import type { JSONContent } from "@tiptap/core";

import { formatUsd } from "@/lib/format";

// Pricing tables live inside the proposal's TipTap document as
// "pricingTable" nodes whose items are an attribute. These helpers are
// shared by the editor, the client page and the signing route, so totals are
// always computed the same way (and on the server for anything recorded).

export const PRICING_NODE = "pricingTable";
export const MAX_ITEMS = 50;
const MAX_UNIT_CENTS = 10_000_000_00; // $10M
const MAX_QUANTITY = 100_000;

export interface PricingItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number; // cents
  optional: boolean;
  selected: boolean; // optional items only: included by default / chosen by the client
}

export function newItemId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}

export function blankItem(over: Partial<PricingItem> = {}): PricingItem {
  return {
    id: newItemId(),
    name: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
    optional: false,
    selected: true,
    ...over,
  };
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Cleans items from untrusted JSON (stored content, the editor, the client). */
export function sanitizeItems(value: unknown): PricingItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: PricingItem[] = [];
  for (const raw of value.slice(0, MAX_ITEMS)) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    let id = str(r.id, 40).replace(/[^a-zA-Z0-9_-]/g, "");
    if (!id || seen.has(id)) id = newItemId();
    seen.add(id);
    const optional = r.optional === true;
    items.push({
      id,
      name: str(r.name, 200),
      description: str(r.description, 500),
      quantity: Math.round(num(r.quantity, 0, MAX_QUANTITY, 1) * 100) / 100,
      unitPrice: Math.round(num(r.unitPrice, 0, MAX_UNIT_CENTS, 0)),
      optional,
      selected: optional ? r.selected !== false : true,
    });
  }
  return items;
}

export function lineTotal(item: PricingItem) {
  return Math.round(item.quantity * item.unitPrice);
}

/** Total of required items plus the optional items that are selected. */
export function tableTotal(items: PricingItem[], selected?: ReadonlySet<string>) {
  return items.reduce((sum, item) => {
    const included = !item.optional || (selected ? selected.has(item.id) : item.selected);
    return included ? sum + lineTotal(item) : sum;
  }, 0);
}

function walk(node: JSONContent, visit: (node: JSONContent) => JSONContent | void): JSONContent {
  const replaced = visit(node) ?? node;
  if (!replaced.content) return replaced;
  return { ...replaced, content: replaced.content.map((child) => walk(child, visit)) };
}

/** Every pricing table's items, in document order. */
export function pricingTablesIn(content: JSONContent | null | undefined) {
  const tables: PricingItem[][] = [];
  if (content) walk(content, (node) => {
    if (node.type === PRICING_NODE) tables.push(sanitizeItems(node.attrs?.items));
  });
  return tables;
}

/** The ids of optional items that start selected. */
export function defaultSelection(content: JSONContent | null | undefined) {
  const ids = new Set<string>();
  for (const items of pricingTablesIn(content)) {
    for (const item of items) if (item.optional && item.selected) ids.add(item.id);
  }
  return ids;
}

/**
 * Bakes the client's choice of optional items into the document, so the
 * signed record (page and PDF) shows exactly what was agreed, and returns the
 * grand total across all pricing tables. Unknown ids are ignored.
 */
export function applySelection(content: JSONContent, selectedIds: Iterable<string>) {
  const selected = new Set(selectedIds);
  let total = 0;
  let tables = 0;
  const next = walk(content, (node) => {
    if (node.type !== PRICING_NODE) return;
    tables++;
    const items = sanitizeItems(node.attrs?.items).map((item) =>
      item.optional ? { ...item, selected: selected.has(item.id) } : item
    );
    total += tableTotal(items);
    return { ...node, attrs: { ...node.attrs, items } };
  });
  return { content: next, total: tables ? total : null };
}

/** "$2,500" for whole dollars, "$62.50" otherwise. */
export function money(cents: number) {
  return formatUsd(cents, { whole: cents % 100 === 0 });
}
