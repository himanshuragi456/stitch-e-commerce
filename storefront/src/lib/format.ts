// Formatting helpers. Money is always integer paise in the API.

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrWithPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format paise as ₹. Whole rupees by default; pass true to show paise. */
export function formatPaise(paise: number, showPaise = false): string {
  const rupees = paise / 100;
  return showPaise && paise % 100 !== 0 ? inrWithPaise.format(rupees) : inr.format(rupees);
}

/** Price for one piece of cloth at the given length. */
export function priceForLength(pricePerMetrePaise: number, lengthMetres: number): number {
  return Math.round(pricePerMetrePaise * lengthMetres);
}

/** "1.50 m" — trims trailing zeros sensibly. */
export function formatLength(metres: string | number): string {
  const n = typeof metres === 'string' ? parseFloat(metres) : metres;
  return `${n.toFixed(2).replace(/\.?0+$/, '')} m`;
}
