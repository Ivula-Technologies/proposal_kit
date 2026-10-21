"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BUILT_IN_TEMPLATES } from "@/lib/templates";

export function NewProposalButton({
  children,
  ...buttonProps
}: ButtonProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const router = useRouter();

  async function createProposal(template: string | null) {
    setCreating(template ?? "blank");

    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(template ? { template } : {}),
    });

    if (res.status === 403) {
      setCreating(null);
      setOpen(false);
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Choose a plan to keep creating proposals");
      router.push("/settings#billing");
      return;
    }

    if (!res.ok) {
      setCreating(null);
      toast.error("Couldn't create proposal");
      return;
    }

    const { proposal } = await res.json();
    router.push(`/editor/${proposal.id}`);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} {...buttonProps}>
        {children ?? (
          <>
            <Plus className="h-4 w-4" />
            New Proposal
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a new proposal</DialogTitle>
            <DialogDescription>
              Each template has a full scope, pricing and terms you can edit. Replace anything in [brackets].
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[60vh] gap-2 overflow-y-auto">
            {BUILT_IN_TEMPLATES.map((template) => (
              <PickerOption
                key={template.key}
                title={template.name}
                description={template.description}
                highlighted
                loading={creating === template.key}
                disabled={creating !== null}
                onClick={() => createProposal(template.key)}
              />
            ))}
            <PickerOption
              title="Blank proposal"
              description="Start from an empty page"
              loading={creating === "blank"}
              disabled={creating !== null}
              onClick={() => createProposal(null)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PickerOption({
  title,
  description,
  highlighted = false,
  loading,
  disabled,
  onClick,
}: {
  title: string;
  description: string;
  highlighted?: boolean;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3 rounded-md border border-neutral-border p-3 text-left hover:border-brand-cyan hover:bg-brand-light disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-neutral-muted" />
      ) : (
        <FileText
          className={
            highlighted
              ? "h-5 w-5 shrink-0 text-brand-cyan"
              : "h-5 w-5 shrink-0 text-neutral-muted"
          }
        />
      )}
      <div>
        <p className="text-sm font-medium text-brand-navy">{title}</p>
        <p className="text-xs text-neutral-muted">{description}</p>
      </div>
    </button>
  );
}
