"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  CopyPlus,
  Download,
  Eye,
  Loader2,
  MoreHorizontal,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/react";

import { Editor } from "@/components/shared/Editor";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isEmail } from "@/lib/validate";
import type { Proposal } from "@/types";

const AUTOSAVE_DELAY_MS = 1_500;

// Template placeholders look like "[Client name]" or "$[amount]".
function placeholdersIn(content: JSONContent | null) {
  const found = new Set<string>();
  const walk = (node: JSONContent) => {
    if (node.text) {
      node.text.match(/\[[^\]\n]{2,60}\]/g)?.forEach((match) => found.add(match));
    }
    node.content?.forEach(walk);
  };
  if (content) walk(content);
  return Array.from(found);
}

function confirmNoPlaceholders(content: JSONContent | null) {
  const left = placeholdersIn(content);
  if (left.length === 0) return true;
  const sample = left.slice(0, 3).join(", ");
  return window.confirm(
    `This proposal still has ${left.length} placeholder${left.length === 1 ? "" : "s"} in brackets, like ${sample}. Your client will see them. Continue anyway?`
  );
}

async function patchProposal(id: string, updates: Record<string, unknown>) {
  const res = await fetch(`/api/proposals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, error: body.error as string | undefined };
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function EditorClient({
  proposal,
  canEdit,
  payoutsReady,
  emailReady,
}: {
  proposal: Proposal;
  canEdit: boolean;
  payoutsReady: boolean;
  emailReady: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(proposal.title);
  const [clientName, setClientName] = useState(proposal.client_name ?? "");
  const [clientEmail, setClientEmail] = useState(proposal.client_email ?? "");
  const [depositDollars, setDepositDollars] = useState(
    proposal.deposit_amount ? String(proposal.deposit_amount / 100) : ""
  );
  const [status, setStatus] = useState(proposal.status);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [sendOpen, setSendOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = status === "signed" || !canEdit;

  const contentRef = useRef<JSONContent | null>(
    proposal.content as JSONContent | null
  );
  const dirtyRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async () => {
    if (!dirtyRef.current) return true;
    dirtyRef.current = false;
    setSaveState("saving");

    const parsedDeposit = Math.round(parseFloat(depositDollars) * 100);
    const depositAmount =
      Number.isFinite(parsedDeposit) && parsedDeposit > 0
        ? parsedDeposit
        : null;

    const { ok, error } = await patchProposal(proposal.id, {
      title,
      client_name: clientName || null,
      // An address that's still being typed is saved once it's complete.
      ...(clientEmail === "" || isEmail(clientEmail.trim())
        ? { client_email: clientEmail.trim() || null }
        : {}),
      ...(payoutsReady ? { deposit_amount: depositAmount } : {}),
      content: contentRef.current,
    });

    if (!ok) {
      setSaveState("error");
      toast.error(error ?? "Couldn't save changes");
      return false;
    }
    setSaveState("saved");
    return true;
  }, [title, clientName, clientEmail, depositDollars, payoutsReady, proposal.id]);

  const scheduleSave = useCallback(() => {
    if (locked) return;
    dirtyRef.current = true;
    setSaveState("idle");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(save, AUTOSAVE_DELAY_MS);
  }, [save, locked]);

  async function flushSave() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    return save();
  }

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

  const publicUrl = () => `${window.location.origin}/p/${proposal.id}`;

  async function handleCopyLink() {
    if (status === "draft" && !confirmNoPlaceholders(contentRef.current)) return;
    await flushSave();
    try {
      await navigator.clipboard.writeText(publicUrl());
      toast.success("Link copied. Paste it into an email or message to your client.");
    } catch {
      toast.message(publicUrl());
    }

    if (status === "draft" && canEdit) {
      const { ok } = await patchProposal(proposal.id, { status: "sent" });
      if (ok) setStatus("sent");
    }
  }

  async function handlePreview() {
    await flushSave();
    window.open(`/p/${proposal.id}`, "_blank", "noopener");
  }

  function openSend() {
    if (!isEmail(clientEmail.trim())) {
      toast.error("Add your client's email first");
      return;
    }
    if (!confirmNoPlaceholders(contentRef.current)) return;
    setSendOpen(true);
  }

  async function handleSend() {
    setSending(true);
    const saved = await flushSave();
    if (!saved) {
      setSending(false);
      return;
    }
    const res = await fetch(`/api/proposals/${proposal.id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const body = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      toast.error(body.error ?? "Couldn't send the email");
      return;
    }
    setSendOpen(false);
    if (body.status) setStatus(body.status);
    toast.success(`Sent to ${clientEmail.trim()}. You'll get an email when they open it.`);
  }

  async function handleDuplicate() {
    setBusy(true);
    await flushSave();
    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duplicateOf: proposal.id }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast.error(body.error ?? "Couldn't duplicate this proposal");
      if (res.status === 403) router.push("/settings#billing");
      return;
    }
    toast.success("Copy created");
    router.push(`/editor/${body.proposal.id}`);
  }

  async function handleDelete() {
    if (!window.confirm("Delete this proposal? Its link will stop working.")) return;
    setBusy(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    dirtyRef.current = false;
    const res = await fetch(`/api/proposals/${proposal.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Couldn't delete this proposal");
      return;
    }
    toast.success("Proposal deleted");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-neutral-border bg-white px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            aria-label="Back to proposals"
            className="shrink-0 text-neutral-muted hover:text-brand-navy"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <input
            value={title}
            onChange={handleFieldChange(setTitle)}
            disabled={locked}
            placeholder="Untitled proposal"
            aria-label="Proposal title"
            className="w-full min-w-0 truncate bg-transparent text-lg font-semibold text-brand-navy outline-none placeholder:text-neutral-muted"
          />
          <SaveIndicator state={saveState} />
          <StatusBadge status={status} className="shrink-0" />
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Input
              value={clientName}
              onChange={handleFieldChange(setClientName)}
              disabled={locked}
              placeholder="Client name"
              aria-label="Client name"
              className="h-9 sm:w-40"
            />
            <Input
              value={clientEmail}
              onChange={handleFieldChange(setClientEmail)}
              disabled={locked}
              placeholder="Client email"
              aria-label="Client email"
              type="email"
              inputMode="email"
              className="h-9 sm:w-52"
            />
            <div
              className="relative col-span-2 sm:col-span-1"
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
                placeholder="Deposit (optional)"
                aria-label="Deposit amount in US dollars"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                className="h-9 pl-7 sm:w-40"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePreview}>
              <Eye className="h-3.5 w-3.5" />
              Preview
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <Copy className="h-3.5 w-3.5" />
              Copy link
            </Button>
            {status !== "signed" && canEdit && emailReady && (
              <Button size="sm" onClick={openSend}>
                <Send className="h-3.5 w-3.5" />
                {status === "draft" ? "Send to client" : "Send again"}
              </Button>
            )}
            {status === "signed" && (
              <Button asChild variant="outline" size="sm">
                <a href={`/api/pdf?proposalId=${proposal.id}`} target="_blank" rel="noreferrer">
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </a>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="More actions" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDuplicate}>
                  <CopyPlus className="h-4 w-4" />
                  Duplicate for a new client
                </DropdownMenuItem>
                {status !== "signed" && (
                  <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {(status === "signed" || !canEdit || !payoutsReady) && (
        <div className="border-b border-neutral-border bg-brand-light px-4 py-2 text-center text-xs text-brand-navy md:px-6">
          {status === "signed" ? (
            "This proposal is signed, so it can't be edited. Duplicate it to reuse it for another client."
          ) : !canEdit ? (
            <>
              Your free trial has ended, so this proposal is read-only.{" "}
              <Link href="/settings#billing" data-hide-in-app className="font-semibold underline">
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

      <div className="flex flex-1 items-start justify-center overflow-y-auto bg-neutral-bg">
        <div className="w-full max-w-3xl bg-white shadow-sm md:my-6 md:rounded-lg md:border md:border-neutral-border">
          <Editor
            content={contentRef.current}
            onUpdate={handleEditorUpdate}
            editable={!locked}
          />
        </div>
      </div>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send to {clientName.trim() || clientEmail.trim()}</DialogTitle>
            <DialogDescription>
              We&apos;ll email {clientEmail.trim()} a link to review and sign.
              Replies come to you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sendMessage">Personal note (optional)</Label>
            <Textarea
              id="sendMessage"
              value={message}
              maxLength={2000}
              rows={5}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Hi ${clientName.trim() || "there"}, great talking today. Here's the proposal we discussed. Happy to jump on a call if you have questions.`}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") {
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs text-neutral-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="hidden sm:inline">Saving</span>
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs text-neutral-muted">
        <Check className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Saved</span>
      </span>
    );
  }
  if (state === "error") {
    return <span className="shrink-0 text-xs text-red-600">Not saved</span>;
  }
  return null;
}
