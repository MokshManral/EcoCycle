import { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { UPLOAD_RULES } from '../../utils/constants';

export default function FileUpload({ onSelect, error, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const pick = (files) => { if (files?.[0]) onSelect(files[0]); };
  const errId = 'upload-error';

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) pick(e.dataTransfer.files); }}
        className={`flex flex-col items-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${dragging ? 'border-moss bg-sage' : error ? 'border-clay bg-clay-soft/40' : 'border-line bg-white'}`}
      >
        <span className="mb-4 rounded-full bg-sage p-3 text-moss"><ImagePlus className="h-7 w-7" aria-hidden="true" /></span>
        <p className="font-medium text-forest">Drag a photo here, or choose one</p>
        <p className="mt-1 text-sm text-muted">{UPLOAD_RULES.hint}. Show one item clearly, in good light.</p>
        <label className={`mt-5 inline-flex cursor-pointer items-center rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-white hover:bg-forest-700 focus-within:ring-2 focus-within:ring-moss focus-within:ring-offset-2 ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
          Choose image
          <input ref={inputRef} type="file" accept={UPLOAD_RULES.types.join(',')} className="sr-only" disabled={disabled}
            aria-describedby={error ? errId : undefined}
            onChange={(e) => { pick(e.target.files); e.target.value = ''; }} />
        </label>
      </div>
      {error && <p id={errId} role="alert" className="mt-3 text-sm text-clay">{error}</p>}
    </div>
  );
}
