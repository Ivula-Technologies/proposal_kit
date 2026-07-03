import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PricingCard } from "@/components/shared/PricingCard";
import { PRICING_TIERS } from "@/lib/lemonsqueezy";

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-neutral-bg px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-1 text-sm text-neutral-muted hover:text-brand-navy"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <h1 className="mb-2 text-center text-2xl font-bold text-brand-navy">
          You&apos;ve hit your plan&apos;s proposal limit
        </h1>
        <p className="mb-10 text-center text-sm text-neutral-muted">
          Upgrade to keep creating proposals — no US entity required.
        </p>

        <div className="grid gap-6 sm:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <PricingCard key={tier.plan} tier={tier} />
          ))}
        </div>
      </div>
    </div>
  );
}
