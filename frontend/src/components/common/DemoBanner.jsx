import { FlaskConical } from 'lucide-react';
import { USE_MOCK } from '../../services/api';

export default function DemoBanner() {
  if (!USE_MOCK) return null;
  return (
    <div className="flex items-center gap-2 bg-amber-soft px-4 py-2 text-sm text-amber">
      <FlaskConical className="h-4 w-4 shrink-0" aria-hidden="true" />
      <p>Demo mode: you’re seeing sample data. Nothing is sent to a server and changes reset on refresh.</p>
    </div>
  );
}
