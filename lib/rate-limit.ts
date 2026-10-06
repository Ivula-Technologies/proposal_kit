// Small in-memory limiter for public routes. cPanel runs one Node process
// per app, so a per-process window is enough to stop casual abuse.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      buckets.forEach((b, k) => {
        if (b.resetAt <= now) buckets.delete(k);
      });
    }
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

export function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
