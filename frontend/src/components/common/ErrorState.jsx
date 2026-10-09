import { AlertCircle } from 'lucide-react';
import Button from './Button';

export default function ErrorState({ error, onRetry, title = 'Something went wrong' }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-clay/30 bg-clay-soft p-5 sm:flex-row sm:items-center">
      <AlertCircle className="h-6 w-6 shrink-0 text-clay" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-medium text-clay">{title}</p>
        <p className="text-sm text-ink/80">{error?.message || 'Please try again.'}</p>
      </div>
      {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
