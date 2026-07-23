// Currency formatting for the bookshop — Sri Lankan Rupees (LKR).
const nf = new Intl.NumberFormat('en-LK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function money(n: number): string {
  const value = Number.isFinite(n) ? n : 0;
  return `Rs ${nf.format(value)}`;
}
