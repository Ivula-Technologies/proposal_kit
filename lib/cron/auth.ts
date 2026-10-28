/** True when the request carries the cron secret (cPanel cron jobs send it). */
export function isCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  return !!secret && request.headers.get("authorization") === `Bearer ${secret}`;
}
