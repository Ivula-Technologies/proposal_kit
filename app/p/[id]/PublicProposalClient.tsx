"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/react";

import { Editor } from "@/components/shared/Editor";
import { SignaturePad } from "@/components/shared/SignaturePad";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Proposal } from "@/types";

export function PublicProposalClient({ proposal }: { proposal: Proposal }) {
  const [signed, setSigned] = useState(proposal.status === "signed");
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!signerName.trim()) {
      toast.error("Enter your name");
      return;
    }
    if (!signatureDataUrl) {
      toast.error("Add your signature");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: proposal.id,
          signerName,
          signerEmail,
          signatureDataUrl,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to sign");
      }

      setSigned(true);
      toast.success("Signed! A copy has been emailed to you.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sign");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-bg px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-[720px]">
        <div className="mb-6 text-center text-sm font-semibold text-brand-navy">
          Proposal<span className="text-brand-cyan">Kit</span>
        </div>

        <div className="rounded-lg border border-neutral-border bg-white shadow-sm">
          <div className="border-b border-neutral-border px-4 py-6 sm:px-8">
            <h1 className="text-2xl font-bold text-brand-navy">
              {proposal.title}
            </h1>
            {proposal.client_name && (
              <p className="mt-1 text-sm text-neutral-muted">
                Prepared for {proposal.client_name}
              </p>
            )}
          </div>

          <Editor
            content={proposal.content as JSONContent | null}
            editable={false}
          />

          <div className="border-t border-neutral-border px-4 py-8 sm:px-8">
            {signed ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-status-signed" />
                <h2 className="text-lg font-semibold text-brand-navy">
                  This proposal has been signed
                </h2>
                <p className="max-w-sm text-sm text-neutral-muted">
                  A signed copy has been emailed to you and to the sender.
                </p>
              </div>
            ) : (
              <Card className="border-0 shadow-none">
                <CardContent className="space-y-4 p-0">
                  <h2 className="text-lg font-semibold text-brand-navy">
                    Sign this proposal
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="signerName">Full name</Label>
                        <Input
                          id="signerName"
                          value={signerName}
                          onChange={(e) => setSignerName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signerEmail">Email</Label>
                        <Input
                          id="signerEmail"
                          type="email"
                          value={signerEmail}
                          onChange={(e) => setSignerEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Signature</Label>
                      <SignaturePad onChange={setSignatureDataUrl} />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={submitting}
                    >
                      {submitting && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Sign & submit
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
