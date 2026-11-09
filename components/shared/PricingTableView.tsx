"use client";

import { createContext, useContext, useState } from "react";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { Plus, Trash2 } from "lucide-react";

import { PricingTable } from "@/lib/tiptap/pricing-table";
import { blankItem, lineTotal, MAX_ITEMS, money, sanitizeItems, tableTotal, type PricingItem } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/**
 * The client's choice of optional items on the public page. When no
 * provider is present (the editor), each item's own `selected` flag is used.
 */
export const PricingSelectionContext = createContext<{
  selected: ReadonlySet<string>;
  toggle: (id: string) => void;
  locked: boolean;
} | null>(null);

function dollars(cents: number) {
  return cents ? String(cents / 100) : "";
}

function EditableRow({
  item,
  onChange,
  onRemove,
}: {
  item: PricingItem;
  onChange: (next: PricingItem) => void;
  onRemove: () => void;
}) {
  const [price, setPrice] = useState(dollars(item.unitPrice));
  const input =
    "w-full rounded-md border border-neutral-border bg-white px-2 py-1.5 text-sm text-brand-navy outline-none focus:border-brand-cyan";
  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-neutral-border py-3 last:border-b-0 sm:grid-cols-[1fr_5rem_7rem_6rem_auto] sm:items-start">
      <div className="col-span-2 space-y-1.5 sm:col-span-1">
        <input
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
          placeholder="Item, e.g. Website design"
          aria-label="Item name"
          className={cn(input, "font-medium")}
        />
        <input
          value={item.description}
          onChange={(e) => onChange({ ...item, description: e.target.value })}
          placeholder="Short description (optional)"
          aria-label="Item description"
          className={cn(input, "text-xs")}
        />
        <label className="flex items-center gap-2 text-xs text-neutral-muted">
          <input
            type="checkbox"
            checked={item.optional}
            onChange={(e) => onChange({ ...item, optional: e.target.checked, selected: e.target.checked ? false : true })}
            className="h-3.5 w-3.5 accent-brand-navy"
          />
          Optional add-on the client can choose
        </label>
        {item.optional && (
          <label className="flex items-center gap-2 pl-5 text-xs text-neutral-muted">
            <input
              type="checkbox"
              checked={item.selected}
              onChange={(e) => onChange({ ...item, selected: e.target.checked })}
              className="h-3.5 w-3.5 accent-brand-navy"
            />
            Ticked by default
          </label>
        )}
      </div>
      <label className="text-xs text-neutral-muted sm:contents">
        <span className="sm:hidden">Qty</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={item.quantity}
          onChange={(e) => onChange({ ...item, quantity: Math.max(0, Number(e.target.value) || 0) })}
          aria-label="Quantity"
          className={cn(input, "text-right")}
        />
      </label>
      <label className="relative text-xs text-neutral-muted sm:contents">
        <span className="sm:hidden">Price</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={price}
          placeholder="0"
          onChange={(e) => {
            setPrice(e.target.value);
            onChange({ ...item, unitPrice: Math.max(0, Math.round((Number(e.target.value) || 0) * 100)) });
          }}
          aria-label="Unit price in US dollars"
          className={cn(input, "text-right")}
        />
      </label>
      <div className="self-center text-right text-sm font-medium text-brand-navy">
        {money(lineTotal(item))}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove item"
        className="self-center justify-self-end rounded-md p-1.5 text-neutral-muted hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function PricingTableNodeView({ node, updateAttributes, editor, selected: nodeSelected }: ReactNodeViewProps) {
  const items = sanitizeItems(node.attrs.items);
  const selection = useContext(PricingSelectionContext);
  const editable = editor.isEditable;
  const setItems = (next: PricingItem[]) => updateAttributes({ items: next });

  if (editable) {
    return (
      <NodeViewWrapper
        className={cn(
          "not-prose my-6 rounded-lg border border-neutral-border bg-neutral-bg/60 p-3 sm:p-4",
          nodeSelected && "ring-2 ring-brand-cyan"
        )}
        contentEditable={false}
      >
        <div className="mb-1 hidden grid-cols-[1fr_5rem_7rem_6rem_auto] gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-muted sm:grid">
          <span>Pricing</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Price ($)</span>
          <span className="text-right">Total</span>
          <span className="w-7" />
        </div>
        {items.map((item, i) => (
          <EditableRow
            key={item.id}
            item={item}
            onChange={(next) => setItems(items.map((it, j) => (j === i ? next : it)))}
            onRemove={() => setItems(items.filter((_, j) => j !== i))}
          />
        ))}
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={items.length >= MAX_ITEMS}
            onClick={() => setItems([...items, blankItem()])}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-brand-navy hover:bg-brand-light disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add item
          </button>
          <div className="text-sm text-brand-navy">
            Total <span className="ml-2 text-base font-bold">{money(tableTotal(items))}</span>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  const isOn = (item: PricingItem) =>
    !item.optional || (selection ? selection.selected.has(item.id) : item.selected);
  const total = items.reduce((sum, item) => (isOn(item) ? sum + lineTotal(item) : sum), 0);
  const hasOptional = items.some((item) => item.optional);

  return (
    <NodeViewWrapper className="not-prose my-6 overflow-hidden rounded-lg border border-neutral-border" contentEditable={false}>
      {hasOptional && selection && !selection.locked && (
        <p className="border-b border-neutral-border bg-brand-light px-4 py-2 text-xs text-brand-navy">
          Tick the optional add-ons you want. The total updates as you go.
        </p>
      )}
      <ul>
        {items.map((item) => {
          const on = isOn(item);
          const canToggle = item.optional && !!selection && !selection.locked;
          return (
            <li
              key={item.id}
              className={cn(
                "flex items-start gap-3 border-b border-neutral-border px-4 py-3 last:border-b-0",
                !on && "bg-neutral-bg/60"
              )}
            >
              {item.optional && (
                <input
                  type="checkbox"
                  checked={on}
                  disabled={!canToggle}
                  onChange={() => selection?.toggle(item.id)}
                  aria-label={`Include ${item.name || "this add-on"}`}
                  className="mt-1 h-4 w-4 shrink-0 accent-brand-navy"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className={cn("font-medium text-brand-navy", !on && "text-neutral-muted")}>
                  {item.name || "Item"}
                  {item.optional && (
                    <span className="ml-2 rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-semibold text-brand-navy">
                      Optional
                    </span>
                  )}
                </div>
                {item.description && <div className="text-sm text-neutral-muted">{item.description}</div>}
                {item.quantity !== 1 && (
                  <div className="text-xs text-neutral-muted">
                    {item.quantity} × {money(item.unitPrice)}
                  </div>
                )}
              </div>
              <div className={cn("shrink-0 text-right font-medium text-brand-navy", !on && "text-neutral-muted line-through")}>
                {money(lineTotal(item))}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between bg-brand-navy px-4 py-3 text-white">
        <span className="text-sm font-medium">Total</span>
        <span className="text-lg font-bold">{money(total)}</span>
      </div>
    </NodeViewWrapper>
  );
}

/** The pricing table with its interactive view, for the browser editors. */
export const PricingTableExtension = PricingTable.extend({
  addNodeView() {
    return ReactNodeViewRenderer(PricingTableNodeView);
  },
});
