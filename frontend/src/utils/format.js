export const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};
export const formatNumber = (n) => (typeof n === 'number' ? n.toLocaleString() : '—');
export const percent = (n) => (typeof n === 'number' ? `${Math.round(n * 100)}%` : null);
export const todayISO = () => new Date().toISOString().slice(0, 10);
