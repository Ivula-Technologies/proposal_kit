import Link from "next/link";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { PricingTier } from "@/lib/lemonsqueezy";

export function PricingCard({ tier }: { tier: PricingTier }) {
  return (
    <Card
      className={cn(
        "relative flex flex-col",
        tier.featured && "border-brand-cyan shadow-md ring-1 ring-brand-cyan"
      )}
    >
      {tier.featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-cyan px-3 py-1 text-xs font-semibold text-brand-navy">
          MOST POPULAR
        </span>
      )}
      <CardHeader>
        <p className="text-sm font-semibold text-neutral-muted">{tier.name}</p>
        <p className="text-3xl font-bold text-brand-navy">{tier.price}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <ul className="flex-1 space-y-2">
          {tier.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
              <Check className="h-4 w-4 shrink-0 text-brand-cyan" />
              {feature}
            </li>
          ))}
        </ul>
        <Button
          asChild
          variant={tier.featured ? "default" : "outline"}
          className="w-full"
        >
          <Link href={tier.checkoutUrl ?? "/login"}>
            {tier.checkoutUrl ? "Get started" : "Coming soon"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
