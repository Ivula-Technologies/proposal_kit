"use client";

import { useEffect } from "react";

// Registers /sw.js in production so the app can be installed and shows the
// offline page instead of the browser's error screen.
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
