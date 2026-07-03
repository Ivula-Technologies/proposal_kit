"use client";

import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Navbar({ email }: { email: string | null }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initial = email?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-border bg-white px-4 md:px-6">
      <div className="text-lg font-bold text-brand-navy">
        Proposal<span className="text-brand-cyan">Kit</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-neutral-muted">
            <User className="h-4 w-4" />
            {email}
          </div>
          <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
