import { createHash } from "crypto";

/**
 * A short fingerprint of a proposal's document. The client page sends it
 * back when signing, so a proposal the sender changed after the client
 * opened it can't be signed without the client seeing the new version.
 */
export function contentVersion(content: unknown) {
  return createHash("sha256").update(JSON.stringify(content ?? null)).digest("hex").slice(0, 16);
}
