const currencyFormatters = new Map();

export function formatPrice(amount, currency = 'INR') {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  if (!currencyFormatters.has(currency)) {
    currencyFormatters.set(
      currency,
      new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2, minimumFractionDigits: 0 }),
    );
  }
  return currencyFormatters.get(currency).format(value);
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDuration(days) {
  if (days % 365 === 0) return days === 365 ? 'year' : `${days / 365} years`;
  if (days % 30 === 0) return days === 30 ? 'month' : `${days / 30} months`;
  return `${days} days`;
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}
