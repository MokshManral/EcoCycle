import { useState } from 'react';
import { Truck, ScanLine } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import PickupCard from '../components/pickup/PickupCard';
import { useAsync } from '../hooks/useAsync';
import { pickupService } from '../services/pickupService';
import { PICKUP_STATUSES } from '../utils/constants';

const FILTERS = ['all', ...PICKUP_STATUSES];

export default function PickupsPage() {
  const { data, error, loading, reload } = useAsync(() => pickupService.list('citizen'), []);
  const [filter, setFilter] = useState('all');
  const list = (data || []).filter((p) => filter === 'all' || p.status === filter);

  return (
    <>
      <PageHeader title="My pickups" description="Track each request from submission to verified collection."
        actions={<Button to="/scan" icon={ScanLine}>Identify waste</Button>} />
      {loading && <LoadingSkeleton rows={3} className="h-44" />}
      {error && <ErrorState error={error} onRetry={reload} title="Couldn’t load your pickups" />}
      {data && data.length === 0 && <EmptyState icon={Truck} title="No pickups yet" description="Identify an item, then request a pickup to see it here." action={{ label: 'Identify waste', to: '/scan', icon: ScanLine }} />}
      {data && data.length > 0 && (
        <>
          <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
                className={`rounded-full px-3.5 py-1.5 text-sm capitalize ${filter === f ? 'bg-forest text-white' : 'border border-line bg-white text-muted hover:text-forest'}`}>{f}</button>
            ))}
          </div>
          {list.length === 0
            ? <p className="text-sm text-muted">No pickups with status “{filter}”.</p>
            : <div className="grid gap-4 md:grid-cols-2">{list.map((p) => <PickupCard key={p.pickup_id} pickup={p} detailsTo={`/pickups/${p.pickup_id}`} />)}</div>}
        </>
      )}
    </>
  );
}
