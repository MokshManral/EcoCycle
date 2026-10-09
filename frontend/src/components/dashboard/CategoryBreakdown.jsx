import { WASTE_CATEGORIES } from '../../utils/constants';

const STATUS_LABELS = { requested: 'Requested', accepted: 'Accepted', collected: 'Collected', cancelled: 'Cancelled' };

// Simple accessible bars (used where a full chart would be overkill). `statusMode` labels pickup statuses instead of waste categories.
export default function CategoryBreakdown({ data = [], statusMode = false }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <ul className="space-y-3">
      {data.map((d) => {
        const label = statusMode ? STATUS_LABELS[d.category] || d.category : (WASTE_CATEGORIES[d.category] || WASTE_CATEGORIES.other).label;
        return (
          <li key={d.category}>
            <div className="mb-1 flex justify-between text-sm"><span>{label}</span><span className="font-medium">{d.count}</span></div>
            <div className="h-2 rounded-full bg-sage" role="presentation"><div className="h-2 rounded-full bg-moss" style={{ width: `${(d.count / max) * 100}%` }} /></div>
          </li>
        );
      })}
    </ul>
  );
}
