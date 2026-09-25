const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Formats an amount as Indian rupees with lakh/crore grouping, e.g. ₹1,25,000. */
export function formatINR(amount: number): string {
  return inr.format(amount);
}
