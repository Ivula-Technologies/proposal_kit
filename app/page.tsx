import Image from "next/image";
import Link from "next/link";
import { FileSignature, PenTool, Send, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PricingCard, toTier } from "@/components/shared/PricingCard";
import { PLANS } from "@/lib/billing";

const FAQS = [
  {
    q: "Does my client need an account?",
    a: "No. They open the link on any phone or laptop, read the proposal, sign with a finger or by typing their name, and pay the deposit if you asked for one.",
  },
  {
    q: "Are the e-signatures legally valid?",
    a: "Electronic signatures are valid for most business agreements in the US under the federal ESIGN Act and state UETA laws. ProposalKit records the signer's name, signature, IP address and time, and emails a signed PDF to both of you.",
  },
  {
    q: "Where does the deposit money go?",
    a: "Straight to your own Stripe account and on to your bank. ProposalKit never holds it and takes no cut. Stripe's standard card fee (2.9% + 30¢) comes out of the deposit, like any card payment.",
  },
  {
    q: "Will I know when my client opens it?",
    a: "Yes. You get an email the first time your client opens the proposal, another when they sign, and another when the deposit is paid.",
  },
  {
    q: "Do I have to write proposals from scratch?",
    a: "No. Start from a consulting, design, web build or monthly retainer template with scope, pricing and terms already written, then fill in the brackets.",
  },
  {
    q: "What happens after the free trial?",
    a: "Pick Solo or Pro to keep creating proposals. If you don't, links you already sent keep working and your clients can still sign them. Cancel any time from Settings.",
  },
];

const STEPS = [
  {
    icon: FileSignature,
    title: "Create a proposal",
    description:
      "Pick a consulting, design, web build or retainer template. Scope, pricing and terms are already written.",
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
      "Both of you get a signed PDF by email. The deposit goes straight to your bank through Stripe.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <div className="text-lg font-bold text-brand-navy">
          Proposal<span className="text-brand-cyan">Kit</span>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
          <h1 className="text-3xl font-bold text-brand-navy sm:text-5xl">
            Proposals, contracts, and e-signatures —{" "}
            <span className="text-brand-cyan">in one link.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-neutral-muted sm:text-lg">
            Send a proposal your client can read on their phone, sign in a
            minute, and pay the deposit on the spot. One link, no client
            login.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/login">Start your 14-day free trial</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#pricing">See pricing</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-neutral-muted">
            No credit card needed. Your client never has to create an account.
          </p>
        </section>

        {/* How it works */}
        <section className="bg-white py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-8">
            <h2 className="mb-10 text-center text-2xl font-bold text-brand-navy">
              How it works
            </h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(({ icon: Icon, title, description }, i) => (
                <div key={title} className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-light">
                    <Icon className="h-6 w-6 text-brand-cyan" />
                  </div>
                  <p className="mb-1 text-sm font-semibold text-neutral-muted">
                    Step {i + 1}
                  </p>
                  <h3 className="mb-1 font-semibold text-brand-navy">
                    {title}
                  </h3>
                  <p className="text-sm text-neutral-muted">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-8">
            <h2 className="mb-8 text-center text-2xl font-bold text-brand-navy">
              Questions freelancers ask
            </h2>
            <div className="divide-y divide-neutral-border rounded-lg border border-neutral-border bg-white">
              {FAQS.map(({ q, a }) => (
                <details key={q} className="group px-4 py-4 sm:px-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-brand-navy">
                    {q}
                    <span className="text-brand-cyan transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-muted">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-8">
            <h2 className="mb-2 text-center text-2xl font-bold text-brand-navy">
              Simple pricing for solo freelancers and small agencies
            </h2>
            <p className="mb-10 text-center text-sm text-neutral-muted">
              14 days free, no card required. Cancel any time. ProposalKit
              takes no cut of your deposits; only Stripe&apos;s standard 2.9% +
              30¢ card fee applies.
            </p>
            <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
              {Object.values(PLANS).map((plan) => (
                <PricingCard key={plan.key} tier={toTier(plan)} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-border py-8 text-center text-sm text-neutral-muted">
        <div className="mx-auto mb-6 flex max-w-md items-center justify-center gap-3 text-left">
          <Image
            src="/team/bius-founder.webp"
            alt="Bius Michael Joseph, Founder and CEO of Ivula Technologies"
            width={48}
            height={48}
            className="size-12 rounded-full object-cover ring-2 ring-brand-cyan/40"
          />
          <p className="leading-snug">
            Built by{" "}
            <span className="font-semibold text-brand-navy">
              Bius Michael Joseph
            </span>
            <br />
            Founder &amp; CEO, Ivula Technologies
          </p>
        </div>
        © {new Date().getFullYear()} ProposalKit. Built for freelancers and
        consultants.
      </footer>
    </div>
  );
}
