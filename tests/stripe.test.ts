import { afterEach, describe, expect, it, vi } from "vitest";

import { depositNetFor, platformFeeFor } from "@/lib/stripe";

afterEach(() => vi.unstubAllEnvs());

describe("platformFeeFor", () => {
  it("recovers Stripe's 2.9% + 30¢ by default", () => {
    expect(platformFeeFor(100)).toBe(33);
    expect(platformFeeFor(250_000)).toBe(7_280);
    expect(depositNetFor(250_000)).toBe(242_720);
  });

  it("adds the optional platform cut on top", () => {
    vi.stubEnv("PLATFORM_FEE_BPS", "100");
    expect(platformFeeFor(10_000)).toBe(290 + 30 + 100);
  });

  it("follows custom Stripe pricing and ignores bad values", () => {
    vi.stubEnv("STRIPE_FEE_BPS", "250");
    vi.stubEnv("STRIPE_FEE_FIXED_CENTS", "nope");
    expect(platformFeeFor(10_000)).toBe(250);
  });

  it("never takes the whole deposit", () => {
    expect(platformFeeFor(30)).toBe(29);
  });
});
