import { Link } from 'react-router-dom';
import { ChevronRight, MapPin, Package, StickyNote, UserRound } from 'lucide-react';
import Card from '../common/Card';
import StatusBadge from '../common/StatusBadge';
import WasteCategoryBadge from '../common/WasteCategoryBadge';
import PickupStatusTimeline from './PickupStatusTimeline';
import { formatDate } from '../../utils/format';

// `actions` lets the collector page inject Accept/Verify buttons while citizens get the default "View details" link.
export default function PickupCard({ pickup, detailsTo, showTimeline = true, actions }) {
  return (
    <Card as="article" aria-label={`Pickup ${pickup.pickup_id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted">{pickup.pickup_id} · Requested {formatDate(pickup.created_at)}</p>
          <h3 className="mt-1 text-lg font-semibold">{pickup.waste_item}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <WasteCategoryBadge category={pickup.category} />
            <span className="inline-flex items-center gap-1 text-xs text-muted"><Package className="h-3.5 w-3.5" aria-hidden="true" />Qty {pickup.quantity}</span>
          </div>
        </div>
        <StatusBadge status={pickup.status} />
      </div>

      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex gap-2"><dt className="sr-only">Location</dt><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" /><dd>{pickup.address}</dd></div>
        {pickup.collector && <div className="flex gap-2"><dt className="sr-only">Collector</dt><UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" /><dd>{pickup.collector.name}</dd></div>}
        {pickup.instructions && <div className="flex gap-2"><dt className="sr-only">Instructions</dt><StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" /><dd className="text-muted">{pickup.instructions}</dd></div>}
      </dl>

      {showTimeline && <div className="mt-5"><PickupStatusTimeline status={pickup.status} compact /></div>}
      {pickup.status === 'collected' && typeof pickup.points_awarded === 'number' && (
        <p className="mt-4 rounded-lg bg-sage px-3 py-2 text-sm font-medium text-forest">{pickup.points_awarded} EcoPoints earned</p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div className="flex flex-wrap gap-2">{actions}</div>
        {detailsTo && <Link to={detailsTo} className="inline-flex items-center gap-1 text-sm font-medium text-moss hover:text-forest">View details<ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>}
      </div>
    </Card>
  );
}
