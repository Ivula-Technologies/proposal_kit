import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { loadEntitlement } from "@/lib/billing";
import { Navbar } from "@/components/shared/Navbar";
import { Sidebar } from "@/components/shared/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // RLS lets the signed-in user read their own profile and proposals.
  const { entitlement } = await loadEntitlement(supabase, user.id);

  let banner: string | null = null;
  if (entitlement.state === "trial" && entitlement.trialDaysLeft <= 7) {
    banner = `${entitlement.trialDaysLeft} day${entitlement.trialDaysLeft === 1 ? "" : "s"} left in your free trial.`;
  } else if (entitlement.state === "trial_ended") {
    banner = "Your free trial has ended. Links you already sent still work.";
  } else if (entitlement.state === "inactive") {
    banner = "Your plan isn't active. Links you already sent still work.";
  }

  return (
    <div className="flex h-screen flex-col">
      <Navbar email={user.email ?? null} />
      {banner && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-brand-navy px-4 py-2 text-center text-sm text-white">
          <span>{banner}</span>
          <Link href="/settings#billing" className="font-semibold text-brand-cyan underline-offset-2 hover:underline">
            Choose a plan
          </Link>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
