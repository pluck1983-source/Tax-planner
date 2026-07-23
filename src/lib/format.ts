const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

const preciseCurrencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatGBP(amount: number): string {
  return currencyFormatter.format(Math.round(amount));
}

/** Whole-pence precision, for hourly rates and other small per-unit amounts where rounding to £1 loses meaning. */
export function formatGBPPrecise(amount: number): string {
  return preciseCurrencyFormatter.format(amount);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatHours(hours: number): string {
  const rounded = Math.round(hours * 100) / 100;
  return `${rounded % 1 === 0 ? rounded : rounded.toFixed(2)}h`;
}
