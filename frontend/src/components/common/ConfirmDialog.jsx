import { useEffect, useRef } from 'react';
import Button from './Button';

export default function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', loading, onConfirm, onCancel }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog ref={ref} onCancel={(e) => { e.preventDefault(); if (!loading) onCancel(); }} onClose={onCancel}
      className="w-[calc(100%-2rem)] max-w-md rounded-xl border border-line p-6 shadow-xl backdrop:bg-ink/40" aria-labelledby="confirm-title">
      <h2 id="confirm-title" className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted">{description}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </dialog>
  );
}
