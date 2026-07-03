"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/react";

import { createClient } from "@/lib/supabase/client";
import { Editor } from "@/components/shared/Editor";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Proposal } from "@/types";

const AUTOSAVE_DELAY_MS = 30_000;

export function EditorClient({ proposal }: { proposal: Proposal }) {
  const [title, setTitle] = useState(proposal.title);
  const [clientName, setClientName] = useState(proposal.client_name ?? "");
  const [clientEmail, setClientEmail] = useState(proposal.client_email ?? "");
  const [depositDollars, setDepositDollars] = useState(
    proposal.deposit_amount ? String(proposal.deposit_amount / 100) : ""
  );
  const [status, setStatus] = useState(proposal.status);
  const [saving, setSaving] = useState(false);

  const contentRef = useRef<JSONContent | null>(
    proposal.content as JSONContent | null
  );
  const dirtyRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async () => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    setSaving(true);

    const parsedDeposit = Math.round(parseFloat(depositDollars) * 100);
    const depositAmount =
      Number.isFinite(parsedDeposit) && parsedDeposit > 0
        ? parsedDeposit
        : null;

    const supabase = createClient();
    const { error } = await supabase
      .from("proposals")
      .update({
        title,
        client_name: clientName || null,
        client_email: clientEmail || null,
        deposit_amount: depositAmount,
        content: contentRef.current,
      })
      .eq("id", proposal.id);

    setSaving(false);

    if (error) {
      toast.error("Couldn't save changes");
    } else {
      toast.success("Saved");
    }
  }, [title, clientName, clientEmail, depositDollars, proposal.id]);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(save, AUTOSAVE_DELAY_MS);
  }, [save]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleEditorUpdate(json: JSONContent) {
    contentRef.current = json;
    scheduleSave();
  }

  function handleFieldChange<T extends (v: string) => void>(setter: T) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value as never);
      scheduleSave();
    };
  }

  async function handleCopyLink() {
    const url = `${window.location.origin}/p/${proposal.id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");

    if (status === "draft") {
      const supabase = createClient();
      const { error } = await supabase
        .from("proposals")
        .update({ status: "sent" })
        .eq("id", proposal.id);
      if (!error) setStatus("sent");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 border-b border-neutral-border bg-white px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/dashboard"
            className="shrink-0 text-neutral-muted hover:text-brand-navy"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <input
            value={title}
            onChange={handleFieldChange(setTitle)}
            placeholder="Untitled proposal"
            className="w-full min-w-0 truncate bg-transparent text-lg font-semibold text-brand-navy outline-none placeholder:text-neutral-muted"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={clientName}
            onChange={handleFieldChange(setClientName)}
            placeholder="Client name"
            className="h-9 w-36"
          />
          <Input
            value={clientEmail}
            onChange={handleFieldChange(setClientEmail)}
            placeholder="Client email"
            type="email"
            className="h-9 w-44"
          />
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-muted">
              $
            </span>
            <Input
              value={depositDollars}
              onChange={handleFieldChange(setDepositDollars)}
              placeholder="Deposit"
              type="number"
              min="0"
              step="0.01"
              className="h-9 w-28 pl-7"
            />
          </div>
          <StatusBadge status={status} />
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            <Copy className="h-3.5 w-3.5" />
            Copy link
          </Button>
          {saving && (
            <Loader2 className="h-4 w-4 animate-spin text-neutral-muted" />
          )}
        </div>
      </div>

      <div className="flex flex-1 justify-center overflow-y-auto bg-neutral-bg">
        <div className="w-full max-w-3xl bg-white shadow-sm md:my-6 md:rounded-lg md:border md:border-neutral-border">
          <Editor content={contentRef.current} onUpdate={handleEditorUpdate} />
        </div>
      </div>
    </div>
  );
}
