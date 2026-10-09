import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import { formatDate } from '../../utils/format';

export default function RecentActivity({ pickups = [] }) {
  return (
    <ul className="divide-y divide-line">
      {pickups.map((p) => (
        <li key={p.pickup_id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <Link to={`/pickups/${p.pickup_id}`} className="block truncate font-medium hover:text-moss">{p.waste_item}</Link>
            <p className="text-xs text-muted">{p.pickup_id} · {formatDate(p.created_at)}</p>
          </div>
          <StatusBadge status={p.status} />
        </li>
      ))}
    </ul>
  );
}
