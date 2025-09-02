export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getMonthName(monthNumber: number): string {
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  return months[monthNumber - 1] || '';
}

export function isDateInMonth(date: Date | string, month: number, year: number): boolean {
  const d = new Date(date);
  return d.getMonth() + 1 === month && d.getFullYear() === year;
}

export function isDateInYear(date: Date | string, year: number): boolean {
  const d = new Date(date);
  return d.getFullYear() === year;
}
