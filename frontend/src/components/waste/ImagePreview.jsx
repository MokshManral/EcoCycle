import { RefreshCw, Trash2 } from 'lucide-react';
import Button from '../common/Button';

export default function ImagePreview({ src, name, onRemove, onReplace, disabled, scanning }) {
  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-line bg-sage-50">
        <img src={src} alt={`Preview of ${name || 'selected waste photo'}`} className="mx-auto max-h-[420px] w-full object-contain" />
        {scanning && (
          <div className="pointer-events-none absolute inset-0 bg-forest/10" aria-hidden="true">
            <div className="scanline absolute inset-x-0 h-0.5 bg-moss shadow-[0_0_12px_#2F6B4F]" />
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="truncate text-sm text-muted">{name}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={onReplace} disabled={disabled}>Replace</Button>
          <Button variant="ghost" size="sm" icon={Trash2} onClick={onRemove} disabled={disabled}>Remove</Button>
        </div>
      </div>
    </div>
  );
}
