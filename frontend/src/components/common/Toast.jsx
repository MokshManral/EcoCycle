import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const TONES = {
  success: { icon: CheckCircle2, cls: 'border-moss/40 bg-sage text-forest' },
  error: { icon: AlertCircle, cls: 'border-clay/40 bg-clay-soft text-clay' },
  info: { icon: Info, cls: 'border-line bg-white text-ink' },
};

export default function Toast({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:right-6" role="status" aria-live="polite">
      {toasts.map((t) => {
        const { icon: Icon, cls } = TONES[t.tone];
        return (
          <div key={t.id} className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-3.5 shadow-card ${cls}`}>
            <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="flex-1 text-sm">{t.message}</p>
            <button onClick={() => onDismiss(t.id)} aria-label="Dismiss notification" className="rounded p-0.5 hover:bg-black/5"><X className="h-4 w-4" /></button>
          </div>
        );
      })}
    </div>
  );
}
