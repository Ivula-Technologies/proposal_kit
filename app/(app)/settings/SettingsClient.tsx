"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PricingCard, type PricingTier } from "@/components/shared/PricingCard";
import type { Entitlement } from "@/lib/billing";
import type { Plan } from "@/types";

interface SettingsProfile {
  full_name: string;
  business_name: string;
  email: string;
  hasPayoutAccount: boolean;
  chargesEnabled: boolean;
  hasBillingAccount: boolean;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
}

async function postForUrl(path: string, body?: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error ?? "Something went wrong");
  window.location.href = data.url;
}

export function SettingsClient({
  profile,
  entitlement,
  plans,
  notice,
}: {
  profile: SettingsProfile;
  entitlement: Entitlement;
  plans: { tier: PricingTier; available: boolean }[];
  notice: string | null;
}) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [businessName, setBusinessName] = useState(profile.business_name);
  const [savingProfile, setSavingProfile] = useState(false);
  const [busy, setBusy] = useState<Plan | "portal" | null>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        business_name: businessName.trim() || null,
      })
      .eq("id", user!.id);
    setSavingProfile(false);
    if (error) toast.error("Couldn't save");
    else toast.success("Saved");
  }

  async function run(kind: Plan | "portal") {
    setBusy(kind);
    try {
      if (kind === "portal") await postForUrl("/api/billing/portal");
      else await postForUrl("/api/billing/checkout", { plan: kind });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setBusy(null);
    }
  }

  const statusLine = (() => {
    switch (entitlement.state) {
      case "active":
        return `You're on ${entitlement.plan === "pro" ? "Pro" : "Solo"}${
          profile.subscriptionStatus === "trialing" && entitlement.trialEndsAt
            ? `. Your first charge is on ${format(new Date(entitlement.trialEndsAt), "MMM d")}`
            : profile.currentPeriodEnd
              ? `. Renews ${format(new Date(profile.currentPeriodEnd), "MMM d, yyyy")}`
              : ""
        }.${
          profile.subscriptionStatus === "past_due"
            ? " Your last payment failed, so please update your card."
            : ""
        }`;
      case "trial":
        return `Free trial: ${entitlement.trialDaysLeft} day${
          entitlement.trialDaysLeft === 1 ? "" : "s"
        } left. Pick a plan now and you won't be charged until the trial ends.`;
      case "trial_ended":
        return "Your free trial has ended. Pick a plan to create and edit proposals again. Links you already sent still work.";
      case "inactive":
        return "Your plan isn't active. Reactivate it to create and edit proposals. Links you already sent still work.";
    }
  })();

  const hasPaidPlan = entitlement.state === "active";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <h1 className="text-2xl font-bold text-brand-navy">Settings</h1>

      {notice && (
        <div className="rounded-md bg-brand-light px-4 py-3 text-sm text-brand-navy">
          {notice}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your business</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Your name</Label>
              <Input
                id="fullName"
                value={fullName}
                maxLength={120}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessName">Business name</Label>
              <Input
                id="businessName"
                value={businessName}
                maxLength={120}
                placeholder="Shown to clients on proposals and emails"
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
            <p className="text-sm text-neutral-muted sm:col-span-2">
              Signed copies are sent to {profile.email}.
            </p>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={savingProfile}>
                {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card id="payouts">
        <CardHeader>
          <CardTitle className="text-lg">Deposits and payouts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {profile.chargesEnabled ? (
            <>
              <p className="flex items-center gap-2 font-medium text-status-signed">
                <CheckCircle2 className="h-4 w-4" />
                Ready to take deposits
              </p>
              <p className="text-neutral-muted">
                Client deposits are paid to your own Stripe account and
                deposited into your bank. ProposalKit never holds your money.
              </p>
              <Button asChild variant="outline">
                <a href="/api/connect/dashboard">
                  Open Stripe payouts dashboard
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </>
          ) : (
            <>
              <p className="text-neutral-muted">
                Connect a bank account through Stripe to ask for a deposit
                when your client signs. It takes about five minutes and the
                money goes straight to you.
              </p>
              <Button asChild>
                <a href="/api/connect/onboard">
                  {profile.hasPayoutAccount
                    ? "Finish payout setup"
                    : "Set up payouts with Stripe"}
                </a>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card id="billing">
        <CardHeader>
          <CardTitle className="text-lg">Plan and billing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-neutral-muted">{statusLine}</p>
          {entitlement.monthlyProposals !== null &&
            entitlement.state === "active" && (
              <p className="text-sm text-neutral-muted">
                {entitlement.proposalsThisMonth} of{" "}
                {entitlement.monthlyProposals} proposals used this month.
              </p>
            )}

          {hasPaidPlan || profile.subscriptionStatus ? (
            profile.hasBillingAccount && (
              <Button
                variant="outline"
                onClick={() => run("portal")}
                disabled={busy !== null}
              >
                {busy === "portal" && <Loader2 className="h-4 w-4 animate-spin" />}
                Manage billing
              </Button>
            )
          ) : null}

          {!hasPaidPlan && (
            <div className="grid gap-6 sm:grid-cols-2">
              {plans.map(({ tier, available }) => (
                <PricingCard
                  key={tier.key}
                  tier={tier}
                  action={
                    <Button
                      className="w-full"
                      variant={tier.featured ? "default" : "outline"}
                      disabled={!available || busy !== null}
                      onClick={() => run(tier.key)}
                    >
                      {busy === tier.key && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {available ? `Choose ${tier.name}` : "Coming soon"}
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
