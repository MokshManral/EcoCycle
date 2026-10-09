import { Check, XCircle } from 'lucide-react';

const STEPS = [
  { key: 'requested', label: 'Requested' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'collected', label: 'Collected' },
];

export default function PickupStatusTimeline({ status, compact = false }) {
  if (status === 'cancelled') {
    return <p className="flex items-center gap-2 text-sm font-medium text-clay"><XCircle className="h-4 w-4" aria-hidden="true" />This pickup was cancelled.</p>;
  }
  const current = Math.max(0, STEPS.findIndex((s) => s.key === status));
  return (
    <ol className="flex items-center" aria-label={`Pickup progress: ${STEPS[current].label}`}>
      {STEPS.map((s, i) => {
        const done = i < current || status === 'collected';
        const active = i === current && status !== 'collected';
        return (
          <li key={s.key} className={`flex items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`} aria-current={active ? 'step' : undefined}>
            <span className="flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${done ? 'bg-moss text-white' : active ? 'border-2 border-moss bg-white text-moss' : 'border border-line bg-white text-muted'}`}>
                {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
              </span>
              <span className={`${compact ? 'hidden sm:inline' : ''} text-sm ${done || active ? 'font-medium text-forest' : 'text-muted'}`}>{s.label}</span>
            </span>
            {i < STEPS.length - 1 && <span className={`mx-3 h-0.5 flex-1 rounded ${i < current || status === 'collected' ? 'bg-moss' : 'bg-line'}`} aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
