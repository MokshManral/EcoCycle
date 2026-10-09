import { ScanLine, Sparkles, Truck, Package, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import StatCard from '../components/common/StatCard';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import CategoryBreakdown from '../components/dashboard/CategoryBreakdown';
import RecentActivity from '../components/dashboard/RecentActivity';
import { useAsync } from '../hooks/useAsync';
import { impactService } from '../services/impactService';
import { pickupService } from '../services/pickupService';
import { formatNumber } from '../utils/format';

export default function DashboardPage() {
  const { data, error, loading, reload } = useAsync(async () => {
    const [points, impact, pickups] = await Promise.all([impactService.points(), impactService.impact(), pickupService.list('citizen')]);
    return { points, impact, pickups };
  }, []);

  const isNew = data && data.pickups.length === 0 && !data.points.total_points;

  return (
    <>
      <PageHeader title="Welcome back" description="Here’s where your recycling stands."
        actions={<Button to="/scan" size="lg" icon={ScanLine}>Identify waste</Button>} />
      {loading && <LoadingSkeleton rows={2} className="h-32" />}
      {error && <ErrorState error={error} onRetry={reload} title="Couldn’t load your dashboard" />}
      {isNew && <EmptyState icon={Sparkles} title="Start your first recycling loop" description="Photograph an item, request a pickup, and earn EcoPoints once the collector verifies the handover." action={{ label: 'Identify waste', to: '/scan', icon: ScanLine }} />}
      {data && !isNew && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="EcoPoints balance" value={formatNumber(data.points.total_points)} icon={Sparkles} hint="Verified pickups only" />
            <StatCard label="Completed pickups" value={formatNumber(data.impact.completed_pickups)} icon={Truck} />
            <StatCard label="Items collected" value={formatNumber(data.impact.items_collected)} icon={Package} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <div className="mb-2 flex items-center justify-between"><h2 className="text-base font-semibold">Recent activity</h2><Link to="/pickups" className="inline-flex items-center gap-1 text-sm text-moss hover:text-forest">Pickup history<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></div>
              <RecentActivity pickups={data.pickups.slice(0, 5)} />
            </Card>
            <Card>
              <h2 className="mb-4 text-base font-semibold">Items collected by category</h2>
              {data.impact.category_breakdown.length ? <CategoryBreakdown data={data.impact.category_breakdown} /> : <p className="text-sm text-muted">Category totals appear after your first verified pickup.</p>}
              <p className="mt-5 border-t border-line pt-3 text-xs text-muted">Counts come from verified collections. EcoCycle doesn’t estimate carbon savings.</p>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
