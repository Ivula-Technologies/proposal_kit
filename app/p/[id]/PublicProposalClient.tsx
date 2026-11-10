"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Proposal } from "@/types";

// The signature pad (canvas library + tabs) is only needed if the client
// scrolls down to sign — load it as its own chunk instead of blocking
// first paint of the proposal itself.
const SignaturePad = dynamic(
  () =>
    import("@/components/shared/SignaturePad").then((m) => ({
      default: m.SignaturePad,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[120px] items-center justify-center rounded-md border border-neutral-border bg-white">
        <Loader2 className="h-4 w-4 animate-spin text-neutral-muted" />
      </div>
    ),
  }
);

function formatUsd(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function PublicProposalClient({
  proposal,
  contentHtml,
  depositJustPaid = false,
}: {
  proposal: Proposal;
  contentHtml: string;
  depositJustPaid?: boolean;
}) {
  const [signed, setSigned] = useState(proposal.status === "signed");
  const [payingDeposit, setPayingDeposit] = useState(false);
  const depositDue =
    !!proposal.deposit_amount &&
    proposal.deposit_amount > 0 &&
    !proposal.deposit_paid &&
    !depositJustPaid;
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

  async function handlePayDeposit() {
    setPayingDeposit(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: proposal.id }),
      });
      const body = await res.json();
      if (!res.ok || !body.url) {
        throw new Error(body.error ?? "Couldn't start checkout");
      }
      window.location.href = body.url;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't start checkout"
      );
      setPayingDeposit(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-bg">
      <div className="h-1.5 bg-gradient-to-r from-brand-navy via-brand-cyan to-brand-navy" />
      <div className="px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-[720px]">
          <div className="mb-6 text-center text-sm font-bold tracking-tight text-brand-navy">
            Proposal<span className="text-brand-cyan">Kit</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-neutral-border bg-white shadow-sm">
            <div className="border-b border-neutral-border bg-gradient-to-br from-white to-brand-light/40 px-4 py-8 sm:px-8">
              <h1 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
                {proposal.title}
              </h1>
              {proposal.client_name && (
                <p className="mt-2 text-sm text-neutral-muted">
                  Prepared for{" "}
                  <span className="font-medium text-foreground">
                    {proposal.client_name}
                  </span>
                </p>
              )}
            </div>

            <div
              className="prose prose-sm max-w-none px-4 py-6 prose-headings:text-brand-navy prose-a:text-brand-cyan sm:prose-base sm:px-8 sm:py-8"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />

            <div className="border-t border-neutral-border bg-neutral-bg/50 px-4 py-8 sm:px-8">
            {signed ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-status-signed" />
                <h2 className="text-lg font-semibold text-brand-navy">
                  This proposal has been signed
                </h2>
                <p className="max-w-sm text-sm text-neutral-muted">
                  A signed copy has been emailed to you and to the sender.
                </p>
                {depositJustPaid && (
                  <p className="mt-2 rounded-md bg-brand-light px-4 py-2 text-sm font-medium text-brand-navy">
                    Deposit received — thank you!
                  </p>
                )}
                {depositDue && (
                  <div className="mt-4 flex w-full max-w-sm flex-col gap-2 rounded-lg border border-neutral-border bg-neutral-bg p-4">
                    <p className="text-sm text-neutral-muted">
                      A deposit of{" "}
                      <strong className="text-brand-navy">
                        {formatUsd(proposal.deposit_amount!)}
                      </strong>{" "}
                      is due to kick off this project.
                    </p>
                    <Button
                      onClick={handlePayDeposit}
                      disabled={payingDeposit}
                      variant="accent"
                    >
                      {payingDeposit && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Pay {formatUsd(proposal.deposit_amount!)} deposit
                    </Button>
                    <p className="text-center text-xs text-neutral-muted">
                      Secure payment via Stripe
                    </p>
                  </div>
                )}
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

          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-neutral-muted">
            <Lock className="h-3 w-3" />
            Signed securely with ProposalKit — signature, IP, and timestamp
            are recorded.
          </p>
        </div>
      </div>
    </div>
  );
}
