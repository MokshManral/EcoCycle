import { Sparkles, Truck, Package } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import StatCard from '../components/common/StatCard';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import CategoryBreakdown from '../components/dashboard/CategoryBreakdown';
import { useAsync } from '../hooks/useAsync';
import { impactService } from '../services/impactService';
import { WASTE_CATEGORIES } from '../utils/constants';
import { formatDate, formatNumber } from '../utils/format';

export default function ImpactPage() {
  const { data, error, loading, reload } = useAsync(async () => {
    const [points, impact] = await Promise.all([impactService.points(), impactService.impact()]);
    return { points, impact };
  }, []);
  const chart = (data?.impact.category_breakdown || []).map((d) => ({ name: WASTE_CATEGORIES[d.category]?.label || d.category, count: d.count, category: d.category }));

  return (
    <>
      <PageHeader title="EcoPoints & impact" description="Everything here reflects verified collections." />
      {loading && <LoadingSkeleton rows={2} className="h-32" />}
      {error && <ErrorState error={error} onRetry={reload} title="Couldn’t load impact data" />}
      {data && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total EcoPoints earned" value={formatNumber(data.points.total_points)} icon={Sparkles} />
            <StatCard label="Completed pickups" value={formatNumber(data.impact.completed_pickups)} icon={Truck} />
            <StatCard label="Items collected" value={formatNumber(data.impact.items_collected)} icon={Package} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 text-base font-semibold">Items by category</h2>
              {chart.length === 0 ? <p className="text-sm text-muted">No verified collections yet.</p> : (
                <>
                  <div className="h-60" role="img" aria-label={`Bar chart of items collected: ${chart.map((c) => `${c.name} ${c.count}`).join(', ')}`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chart} margin={{ left: -20, right: 8 }}>
                        <CartesianGrid vertical={false} stroke="#DCE2D7" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#5B665F' }} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#5B665F' }} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: '#F1F6EF' }} />
                        <Bar dataKey="count" name="Items" fill="#2F6B4F" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <details className="mt-3 text-sm"><summary className="cursor-pointer text-moss">View as list</summary><div className="mt-3"><CategoryBreakdown data={data.impact.category_breakdown} /></div></details>
                </>
              )}
            </Card>
            <Card>
              <h2 className="mb-2 text-base font-semibold">Reward transactions</h2>
              {data.points.transactions.length === 0 ? <p className="text-sm text-muted">Points appear here after a pickup is verified.</p> : (
                <ul className="divide-y divide-line">
                  {data.points.transactions.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <div className="min-w-0"><p className="truncate">{t.description}</p><p className="text-xs text-muted">{t.pickup_id} · {formatDate(t.created_at)}</p></div>
                      <span className="font-display text-base font-semibold text-moss">+{t.points}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <Card>
            <h2 className="mb-2 text-base font-semibold">Recycling activity</h2>
            {data.impact.recent_activity.length === 0 ? <EmptyState title="No recycling activity yet" description="Completed pickups will be listed here." /> : (
              <ul className="divide-y divide-line">
                {data.impact.recent_activity.map((p) => (
                  <li key={p.pickup_id} className="flex justify-between gap-3 py-3 text-sm"><span>{p.waste_item} × {p.quantity}</span><span className="text-muted">{formatDate(p.created_at)}</span></li>
                ))}
              </ul>
            )}
            <p className="mt-4 border-t border-line pt-3 text-xs text-muted">EcoCycle doesn’t show carbon or equivalent-savings figures because no calculation method has been defined.</p>
          </Card>
        </div>
      )}
    </>
  );
}
