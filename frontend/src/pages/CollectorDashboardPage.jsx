import { useState } from 'react';
import { Inbox, CheckCircle2, Truck } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ConfirmDialog from '../components/common/ConfirmDialog';
import PickupCard from '../components/pickup/PickupCard';
import OtpVerificationForm from '../components/pickup/OtpVerificationForm';
import { useAsync } from '../hooks/useAsync';
import { useToast } from '../context/ToastContext';
import { pickupService } from '../services/pickupService';

const TABS = [
  { key: 'requested', label: 'Incoming', icon: Inbox, empty: 'No incoming requests right now.' },
  { key: 'accepted', label: 'Accepted', icon: Truck, empty: 'You have no accepted pickups.' },
  { key: 'collected', label: 'Completed', icon: CheckCircle2, empty: 'No completed pickups yet.' },
];

export default function CollectorDashboardPage() {
  const { data, error, loading, reload } = useAsync(() => pickupService.list('collector'), []);
  const toast = useToast();
  const [tab, setTab] = useState('requested');
  const [target, setTarget] = useState(null);
  const [accepting, setAccepting] = useState(false);

  const counts = Object.fromEntries(TABS.map((t) => [t.key, (data || []).filter((p) => p.status === t.key).length]));
  const list = (data || []).filter((p) => p.status === tab);
  const current = TABS.find((t) => t.key === tab);

  async function accept() {
    if (!target || accepting) return;
    setAccepting(true);
    try { await pickupService.accept(target.pickup_id); toast.success(`${target.pickup_id} accepted.`); setTab('accepted'); }
    catch (err) { toast.error(err.message); }
    finally { setAccepting(false); setTarget(null); reload(); }
  }

  return (
    <>
      <PageHeader title="Collector queue" description="Accept incoming requests and confirm each handover with the citizen’s code." />
      <div className="mb-6 flex gap-2 overflow-x-auto" role="tablist" aria-label="Pickup status">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${tab === key ? 'bg-forest text-white' : 'border border-line bg-white text-muted hover:text-forest'}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />{label}<span className={`rounded-full px-1.5 text-xs ${tab === key ? 'bg-white/20' : 'bg-sage'}`}>{counts[key]}</span>
          </button>
        ))}
      </div>
      {loading && !data && <LoadingSkeleton rows={2} className="h-48" />}
      {error && <ErrorState error={error} onRetry={reload} title="Couldn’t load pickups" />}
      {data && list.length === 0 && <EmptyState icon={current.icon} title={current.empty} />}
      <div role="tabpanel" className="grid gap-4 md:grid-cols-2">
        {list.map((p) => (
          <div key={p.pickup_id} className="space-y-3">
            <PickupCard pickup={p} detailsTo={`/collector/pickups/${p.pickup_id}`} showTimeline={p.status !== 'requested'}
              actions={p.status === 'requested' && <Button size="sm" onClick={() => setTarget(p)}>Accept pickup</Button>} />
            {p.status === 'accepted' && (
              <div className="rounded-xl border border-line bg-white p-5">
                <OtpVerificationForm pickupId={p.pickup_id} onVerified={(r) => { toast.success(`${p.pickup_id} verified. ${r?.points_awarded ?? ''} EcoPoints awarded.`); setTab('collected'); reload(); }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <ConfirmDialog open={Boolean(target)} title="Accept this pickup?" description={target ? `${target.waste_item} at ${target.address}` : ''} confirmLabel="Accept pickup" loading={accepting} onConfirm={accept} onCancel={() => !accepting && setTarget(null)} />
    </>
  );
}
