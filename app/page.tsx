import Link from "next/link";
import { FileSignature, PenTool, Send, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PricingCard } from "@/components/shared/PricingCard";
import { PRICING_TIERS } from "@/lib/lemonsqueezy";

const STEPS = [
  {
    icon: FileSignature,
    title: "Create a proposal",
    description:
      "Start from a template or a blank page. Add your pitch, pricing, and terms.",
  },
  {
    icon: Send,
    title: "Share one link",
    description:
      "Send a single shareable link. No login required for your client.",
  },
  {
    icon: PenTool,
    title: "Client signs",
    description:
      "They read, sign with a drawn or typed signature, in under a minute.",
  },
  {
    icon: Wallet,
    title: "You get paid",
    description:
      "Both of you get a signed PDF by email. Deposits land straight in your account.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-neutral-border/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-8">
          <div className="text-lg font-bold tracking-tight text-brand-navy">
            Proposal<span className="text-brand-cyan">Kit</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="#pricing">Pricing</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-light/60 via-background to-background"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-brand-cyan/10 blur-3xl"
          />
          <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:py-28">
            <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-brand-cyan/30 bg-brand-light px-3 py-1 text-xs font-semibold text-brand-navy">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" />
              Built for US freelancers &amp; consultants
            </span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-brand-navy sm:text-6xl">
              Proposals, contracts, and e-signatures —{" "}
              <span className="bg-gradient-to-r from-brand-cyan to-sky-400 bg-clip-text text-transparent">
                in one link.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base text-neutral-muted sm:text-lg">
              Simpler than Proposify, cheaper than PandaDoc, and the only tool
              that collects a deposit the moment your client signs.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="shadow-lg shadow-brand-navy/20">
                <Link href="/login">Start free</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#pricing">See pricing</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-neutral-muted">
              Free to try · No credit card required
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-neutral-border bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-8">
            <h2 className="mb-12 text-center text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
              Signed and paid in four steps
            </h2>
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {STEPS.map(({ icon: Icon, title, description }, i) => (
                <div key={title} className="relative text-center">
                  {i < STEPS.length - 1 && (
                    <div
                      aria-hidden
                      className="absolute left-[calc(50%+2rem)] top-6 hidden h-px w-[calc(100%-4rem)] bg-gradient-to-r from-brand-cyan/40 to-transparent lg:block"
                    />
                  )}
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light ring-1 ring-brand-cyan/20">
                    <Icon className="h-6 w-6 text-brand-cyan" />
                  </div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-muted">
                    Step {i + 1}
                  </p>
                  <h3 className="mb-1.5 font-semibold text-brand-navy">
                    {title}
                  </h3>
                  <p className="mx-auto max-w-[16rem] text-sm leading-relaxed text-neutral-muted">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-8">
            <h2 className="mb-2 text-center text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
              Simple pricing for solo freelancers and small agencies
            </h2>
            <p className="mb-12 text-center text-sm text-neutral-muted">
              No US entity required — Lemon Squeezy handles sales tax for you.
            </p>
            <div className="grid gap-6 sm:grid-cols-3">
              {PRICING_TIERS.map((tier) => (
                <PricingCard key={tier.plan} tier={tier} />
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 pb-16 sm:pb-24">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl bg-brand-navy px-6 py-14 text-center sm:px-12">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Win your next client this week
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/70">
              Send a proposal they can read, sign, and pay — before your
              competitors have finished formatting their PDF.
            </p>
            <Button
              asChild
              size="lg"
              variant="accent"
              className="mt-8 shadow-lg shadow-brand-cyan/25"
            >
              <Link href="/login">Start free</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-border py-8 text-center text-sm text-neutral-muted">
        © {new Date().getFullYear()} ProposalKit. Built for freelancers and
        consultants.
      </footer>
    </div>
  );
}
