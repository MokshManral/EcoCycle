import Card from './Card';

export default function StatCard({ label, value, icon: Icon, hint }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-1 font-display text-3xl font-semibold text-forest">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        {Icon && <span className="rounded-lg bg-sage p-2 text-moss"><Icon className="h-5 w-5" aria-hidden="true" /></span>}
      </div>
    </Card>
  );
}
