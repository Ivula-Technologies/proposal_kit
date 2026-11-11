import { describe, expect, it } from "vitest";
import { runInNewContext } from "node:vm";

import { APP_PLATFORM_SCRIPT, UPLOAD_KEY_SHA256, assetLinks } from "@/lib/app-platform";

// Runs the inline <head> script against a fake page and reports what it did.
function runScript({ path = "/dashboard", search = "", referrer = "", stored = {} as Record<string, string> } = {}) {
  const attrs: Record<string, string> = {};
  let redirectedTo: string | null = null;
  const store = { ...stored };
  runInNewContext(APP_PLATFORM_SCRIPT, {
    URLSearchParams,
    window: { sessionStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } } },
    location: { pathname: path, search, replace: (to: string) => { redirectedTo = to; } },
    document: { referrer, documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v; } } },
  });
  return { app: attrs["data-app"] ?? null, redirectedTo, store };
}

describe("Google Play app", () => {
  it("leaves ordinary browser visits alone", () => {
    expect(runScript({ path: "/" }).app).toBe(null);
    expect(runScript({ path: "/" }).redirectedTo).toBe(null);
  });

  it("marks the app when it opens with ?app=android and remembers it for the tab", () => {
    const first = runScript({ search: "?app=android" });
    expect(first.app).toBe("android");
    expect(runScript({ path: "/settings", stored: first.store }).app).toBe("android");
  });

  it("recognises a launch from the Android app by its referrer", () => {
    expect(runScript({ referrer: "android-app://com.ivulatechnologies.proposalkit/" }).app).toBe("android");
  });

  it("sends the app away from pages with prices", () => {
    expect(runScript({ path: "/", search: "?app=android" }).redirectedTo).toBe("/dashboard");
    expect(runScript({ path: "/settings", search: "?app=android" }).redirectedTo).toBe(null);
  });

  it("asset links always include the upload key and add Play signing keys once each", () => {
    const [link] = assetLinks(" aa:bb , AA:BB,," + UPLOAD_KEY_SHA256.toLowerCase());
    expect(link.target.package_name).toBe("com.ivulatechnologies.proposalkit");
    expect(link.target.sha256_cert_fingerprints).toEqual([UPLOAD_KEY_SHA256, "AA:BB"]);
  });
});
