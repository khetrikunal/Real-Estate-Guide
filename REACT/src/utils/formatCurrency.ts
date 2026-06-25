export function formatCurrency(value: number | string | undefined | null): string {
  const num = typeof value === 'string' ? Number(value.replace(/,/g, '')) : Number(value ?? 0);
  if (!Number.isFinite(num)) return '₹0';

  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (abs >= 1_00_00_000) {
    const cr = (abs / 1_00_00_000).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    return `${sign}₹${cr} Cr`;
  }
  if (abs >= 1_00_000) {
    const lakh = (abs / 1_00_000).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    return `${sign}₹${lakh} L`;
  }

  const formatted = abs.toLocaleString('en-IN');
  return `${sign}₹${formatted}`;
}

export function formatCurrencyShort(value: number | string | undefined | null): string {
  const num = typeof value === 'string' ? Number(value.replace(/,/g, '')) : Number(value ?? 0);
  if (!Number.isFinite(num)) return '₹0';

  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (abs >= 1_00_00_000) {
    const cr = (abs / 1_00_00_000).toFixed(1).replace(/\.0$/, '');
    return `${sign}₹${cr} Cr`;
  }
  if (abs >= 1_00_000) {
    const lakh = (abs / 1_00_000).toFixed(1).replace(/\.0$/, '');
    return `${sign}₹${lakh} L`;
  }

  const formatted = abs.toLocaleString('en-IN');
  return `${sign}₹${formatted}`;
}
