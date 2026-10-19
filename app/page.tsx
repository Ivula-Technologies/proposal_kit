import Image from "next/image";
import Link from "next/link";
import { CalendarClock, FileSignature, PenTool, Send, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PricingCard, toTier } from "@/components/shared/PricingCard";
import { PLANS } from "@/lib/billing";
import { BOOKING_URL } from "@/lib/booking";

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
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <a href={BOOKING_URL} target="_blank" rel="noreferrer">
              <CalendarClock className="h-4 w-4" />
              Book a call
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
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

        {/* Pricing */}
        <section id="pricing" className="py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-8">
            <h2 className="mb-2 text-center text-2xl font-bold text-brand-navy">
              Simple pricing for solo freelancers and small agencies
            </h2>
            <p className="mb-10 text-center text-sm text-neutral-muted">
              14 days free, no card required. Cancel any time. ProposalKit
              takes no cut of your deposits.
            </p>
            <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
              {Object.values(PLANS).map((plan) => (
                <PricingCard key={plan.key} tier={toTier(plan)} />
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-neutral-muted">
              Questions before you start?{" "}
              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-brand-navy underline-offset-4 hover:underline"
              >
                Book a free Google Meet call with our founder
              </a>
            </p>
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
            <br />
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand-navy underline-offset-4 hover:underline"
            >
              Book a call with Bius
            </a>
          </p>
        </div>
        © {new Date().getFullYear()} ProposalKit. Built for freelancers and
        consultants.
      </footer>
    </div>
  );
}
