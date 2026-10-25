"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "pk-install-dismissed";

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Private mode or blocked storage: the banner just comes back next visit.
  }
}

// Phone-only prompt to add ProposalKit to the home screen. Android and
// Chrome get the browser's install dialog; iPhone gets the Share steps,
// since Safari has no install API.
export function InstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const isPhone = window.matchMedia("(max-width: 767px)").matches;
    if (standalone || !isPhone || wasDismissed()) return;

    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIos) {
      setShowIos(true);
      setHidden(false);
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setHidden(false);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden) return null;

  const dismiss = () => {
    rememberDismissed();
    setHidden(true);
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") rememberDismissed();
    setPromptEvent(null);
    setHidden(true);
  };

  return (
    <div className="flex items-center gap-3 border-b border-neutral-border bg-white px-4 py-3 md:hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-brand-navy">Get the ProposalKit app</p>
        {showIos && !promptEvent ? (
          <p className="text-neutral-muted">
            Tap <Share className="inline h-4 w-4 align-text-bottom" aria-label="Share" /> then
            &ldquo;Add to Home Screen&rdquo;.
          </p>
        ) : (
          <p className="text-neutral-muted">Open it from your home screen, full screen.</p>
        )}
      </div>
      {promptEvent && (
        <Button size="sm" onClick={install}>
          Install
        </Button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="rounded-md p-1 text-neutral-muted hover:bg-brand-light"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
