import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets, image optimization, and
     * server-to-server endpoints (Stripe webhooks, cron, health checks) that
     * never carry a user session, so they skip the Supabase auth round trip.
     */
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|offline.html|icons/|apple-touch-icon.png|api/webhooks|api/cron|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
