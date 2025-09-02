export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace('₺', '₺ ');
}

export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
}
