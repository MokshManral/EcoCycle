export default function LoadingSkeleton({ rows = 3, className = 'h-24' }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }).map((_, i) => <div key={i} className={`skeleton rounded-xl ${className}`} />)}
    </div>
  );
}
