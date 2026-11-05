"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, LayoutDashboard, Plus, Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { BOOKING_URL } from "@/lib/booking";
import { NewProposalButton } from "@/components/shared/NewProposalButton";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-neutral-border bg-white md:flex">
        <div className="p-4">
          <NewProposalButton className="w-full" />
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-neutral-muted hover:bg-brand-light hover:text-brand-navy",
                pathname === href && "bg-brand-light text-brand-navy"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto p-3">
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-neutral-muted hover:bg-brand-light hover:text-brand-navy"
          >
            <CalendarClock className="h-4 w-4" />
            Book a help call
          </a>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-neutral-border bg-white pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-4 py-1 text-xs font-medium text-neutral-muted",
              pathname === href && "text-brand-navy"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
        <NewProposalButton
          variant="ghost"
          className="h-auto flex-col gap-0.5 px-4 py-1 text-xs font-medium text-brand-cyan hover:bg-transparent"
        >
          <Plus className="h-5 w-5" />
          New
        </NewProposalButton>
      </nav>
    </>
  );
}
