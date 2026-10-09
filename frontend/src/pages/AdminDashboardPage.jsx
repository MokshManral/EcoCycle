import { ClipboardList, CheckCircle2, Clock, Factory } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import WasteCategoryBadge from '../components/common/WasteCategoryBadge';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import CategoryBreakdown from '../components/dashboard/CategoryBreakdown';
import { useAsync } from '../hooks/useAsync';
import { pickupService } from '../services/pickupService';
import { PICKUP_STATUSES } from '../utils/constants';
import { formatDate } from '../utils/format';

// Aggregates are computed client-side from GET /api/pickup because no admin endpoint is in the contract.
export default function AdminDashboardPage() {
  const { data, error, loading, reload } = useAsync(() => pickupService.list('admin'), []);
  const byStatus = (s) => (data || []).filter((p) => p.status === s).length;
  const cats = Object.entries((data || []).reduce((a, p) => ({ ...a, [p.category]: (a[p.category] || 0) + 1 }), {})).map(([category, count]) => ({ category, count }));

  return (
    <>
      <PageHeader title="Admin overview" description="A simple read-only summary of pickup activity." />
      {loading && <LoadingSkeleton rows={2} className="h-32" />}
      {error && <ErrorState error={error} onRetry={reload} title="Couldn’t load pickup records" />}
      {data && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total requests" value={data.length} icon={ClipboardList} />
            <StatCard label="Awaiting collector" value={byStatus('requested')} icon={Clock} />
            <StatCard label="Collected" value={byStatus('collected')} icon={CheckCircle2} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 text-base font-semibold">Status breakdown</h2>
              <CategoryBreakdown data={PICKUP_STATUSES.map((s) => ({ category: s, count: byStatus(s) }))} statusMode />
            </Card>
            <Card><h2 className="mb-4 text-base font-semibold">Requests by waste category</h2>{cats.length ? <CategoryBreakdown data={cats} /> : <p className="text-sm text-muted">No data.</p>}</Card>
          </div>
          <Card>
            <h2 className="mb-3 text-base font-semibold">Recent pickup records</h2>
            {data.length === 0 ? <p className="text-sm text-muted">No pickups yet.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-xs text-muted"><tr><th className="pb-2 font-medium">ID</th><th className="pb-2 font-medium">Item</th><th className="pb-2 font-medium">Category</th><th className="pb-2 font-medium">Requested</th><th className="pb-2 font-medium">Status</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {data.slice(0, 10).map((p) => (
                      <tr key={p.pickup_id}><td className="py-2.5">{p.pickup_id}</td><td>{p.waste_item}</td><td><WasteCategoryBadge category={p.category} /></td><td>{formatDate(p.created_at)}</td><td><StatusBadge status={p.status} /></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <EmptyState icon={Factory} title="Recycler records aren’t available yet" description="The current API contract has no recycler endpoint. They’ll appear here once the backend provides one." />
        </div>
      )}
    </>
  );
}
