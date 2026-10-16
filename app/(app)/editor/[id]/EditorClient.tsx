"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/react";

import { Editor } from "@/components/shared/Editor";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Proposal } from "@/types";

const AUTOSAVE_DELAY_MS = 2_000;

async function patchProposal(id: string, updates: Record<string, unknown>) {
  const res = await fetch(`/api/proposals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, error: body.error as string | undefined };
}

export function EditorClient({
  proposal,
  canEdit,
  payoutsReady,
}: {
  proposal: Proposal;
  canEdit: boolean;
  payoutsReady: boolean;
}) {
  const [title, setTitle] = useState(proposal.title);
  const [clientName, setClientName] = useState(proposal.client_name ?? "");
  const [clientEmail, setClientEmail] = useState(proposal.client_email ?? "");
  const [depositDollars, setDepositDollars] = useState(
    proposal.deposit_amount ? String(proposal.deposit_amount / 100) : ""
  );
  const [status, setStatus] = useState(proposal.status);
  const [saving, setSaving] = useState(false);
  const locked = status === "signed" || !canEdit;

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

    const { ok, error } = await patchProposal(proposal.id, {
      title,
      client_name: clientName || null,
      client_email: clientEmail || null,
      ...(payoutsReady ? { deposit_amount: depositAmount } : {}),
      content: contentRef.current,
    });

    setSaving(false);

    if (!ok) {
      toast.error(error ?? "Couldn't save changes");
    }
  }, [title, clientName, clientEmail, depositDollars, payoutsReady, proposal.id]);

  const scheduleSave = useCallback(() => {
    if (locked) return;
    dirtyRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(save, AUTOSAVE_DELAY_MS);
  }, [save, locked]);

  // Save on the way out so a quick edit isn't lost.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const flush = () => {
      if (dirtyRef.current) void saveRef.current();
    };
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      flush();
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
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    await save();
    const url = `${window.location.origin}/p/${proposal.id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");

    if (status === "draft" && canEdit) {
      const { ok } = await patchProposal(proposal.id, { status: "sent" });
      if (ok) setStatus("sent");
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
            disabled={locked}
            placeholder="Untitled proposal"
            className="w-full min-w-0 truncate bg-transparent text-lg font-semibold text-brand-navy outline-none placeholder:text-neutral-muted"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={clientName}
            onChange={handleFieldChange(setClientName)}
            disabled={locked}
            placeholder="Client name"
            className="h-9 w-36"
          />
          <Input
            value={clientEmail}
            onChange={handleFieldChange(setClientEmail)}
            disabled={locked}
            placeholder="Client email"
            type="email"
            className="h-9 w-44"
          />
          <div
            className="relative"
            title={
              payoutsReady
                ? "Deposit your client pays after signing"
                : "Set up payouts in Settings to ask for a deposit"
            }
          >
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-muted">
              $
            </span>
            <Input
              value={depositDollars}
              onChange={handleFieldChange(setDepositDollars)}
              disabled={locked || !payoutsReady}
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
          {status === "signed" && (
            <Button asChild variant="outline" size="sm">
              <a href={`/api/pdf?proposalId=${proposal.id}`} target="_blank" rel="noreferrer">
                <Download className="h-3.5 w-3.5" />
                PDF
              </a>
            </Button>
          )}
          {saving && (
            <Loader2 className="h-4 w-4 animate-spin text-neutral-muted" />
          )}
        </div>
      </div>

      {(status === "signed" || !canEdit || !payoutsReady) && (
        <div className="border-b border-neutral-border bg-brand-light px-4 py-2 text-center text-xs text-brand-navy md:px-6">
          {status === "signed" ? (
            "This proposal is signed, so it can't be edited."
          ) : !canEdit ? (
            <>
              Your free trial has ended, so this proposal is read-only.{" "}
              <Link href="/settings#billing" className="font-semibold underline">
                Choose a plan
              </Link>
            </>
          ) : (
            <>
              Want a deposit when your client signs?{" "}
              <Link href="/settings#payouts" className="font-semibold underline">
                Set up payouts
              </Link>
            </>
          )}
        </div>
      )}

      <div className="flex flex-1 justify-center overflow-y-auto bg-neutral-bg">
        <div className="w-full max-w-3xl bg-white shadow-sm md:my-6 md:rounded-lg md:border md:border-neutral-border">
          <Editor
            content={contentRef.current}
            onUpdate={handleEditorUpdate}
            editable={!locked}
          />
        </div>
      </div>
    </div>
  );
}
