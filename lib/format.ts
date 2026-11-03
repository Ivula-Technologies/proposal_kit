/** "$2,500.00" from cents. `whole` drops the cents ("$2,500"). */
export function formatUsd(cents: number, { whole = false } = {}) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    ...(whole ? { maximumFractionDigits: 0 } : {}),
  });
}
