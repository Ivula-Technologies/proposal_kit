"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText, Plus } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Template } from "@/types";

export function NewProposalButton({
  children,
  ...buttonProps
}: ButtonProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  async function openPicker() {
    setOpen(true);
    setLoadingTemplates(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("templates")
      .select("*")
      .eq("is_default", true)
      .order("name");
    setTemplates(data ?? []);
    setLoadingTemplates(false);
  }

  async function createProposal(template: Template | null) {
    setCreating(true);

    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: template ? template.name : "Untitled proposal",
        content: template?.content ?? null,
      }),
    });

    setCreating(false);
    setOpen(false);

    if (res.status === 403) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Choose a plan to keep creating proposals");
      router.push("/settings#billing");
      return;
    }

    if (!res.ok) {
      toast.error("Couldn't create proposal");
      return;
    }

    const { proposal } = await res.json();
    router.push(`/editor/${proposal.id}`);
  }

  return (
    <>
      <Button onClick={openPicker} {...buttonProps}>
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
              Pick a template to start faster, or start from a blank page.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <button
              onClick={() => createProposal(null)}
              disabled={creating}
              className="flex items-center gap-3 rounded-md border border-neutral-border p-3 text-left hover:border-brand-cyan hover:bg-brand-light disabled:opacity-50"
            >
              <FileText className="h-5 w-5 text-neutral-muted" />
              <div>
                <p className="text-sm font-medium text-brand-navy">
                  Blank proposal
                </p>
                <p className="text-xs text-neutral-muted">
                  Start from scratch
                </p>
              </div>
            </button>

            {loadingTemplates ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-neutral-muted" />
              </div>
            ) : (
              templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => createProposal(template)}
                  disabled={creating}
                  className="flex items-center gap-3 rounded-md border border-neutral-border p-3 text-left hover:border-brand-cyan hover:bg-brand-light disabled:opacity-50"
                >
                  <FileText className="h-5 w-5 text-brand-cyan" />
                  <div>
                    <p className="text-sm font-medium text-brand-navy">
                      {template.name}
                    </p>
                    <p className="text-xs capitalize text-neutral-muted">
                      {template.category}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
