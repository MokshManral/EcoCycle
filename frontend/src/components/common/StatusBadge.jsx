import { Clock, UserCheck, CheckCircle2, XCircle } from 'lucide-react';

// Status is conveyed by icon + text + color, never color alone.
const MAP = {
  requested: { label: 'Awaiting collector', icon: Clock, cls: 'bg-amber-soft text-amber' },
  accepted: { label: 'Accepted', icon: UserCheck, cls: 'bg-sky-soft text-sky' },
  collected: { label: 'Collected', icon: CheckCircle2, cls: 'bg-sage text-forest' },
  cancelled: { label: 'Cancelled', icon: XCircle, cls: 'bg-clay-soft text-clay' },
};

export default function StatusBadge({ status }) {
  const s = MAP[status] || { label: status || 'Unknown', icon: Clock, cls: 'bg-sage-50 text-muted' };
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />{s.label}
    </span>
  );
}
