import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, KeyRound, MapPin, Package, StickyNote, UserRound } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import ErrorState from '../components/common/ErrorState';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import StatusBadge from '../components/common/StatusBadge';
import WasteCategoryBadge from '../components/common/WasteCategoryBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import PickupStatusTimeline from '../components/pickup/PickupStatusTimeline';
import OtpVerificationForm from '../components/pickup/OtpVerificationForm';
import { useAsync } from '../hooks/useAsync';
import { useToast } from '../context/ToastContext';
import { pickupService } from '../services/pickupService';
import { formatDate } from '../utils/format';

const Row = ({ icon: Icon, label, children }) => (
  <div className="flex gap-3 py-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" /><div><dt className="text-xs text-muted">{label}</dt><dd className="text-sm">{children}</dd></div></div>
);

export default function PickupDetailsPage({ viewer = 'citizen' }) {
  const { pickupId } = useParams();
  const toast = useToast();
  const { data: p, error, loading, reload } = useAsync(() => pickupService.get(pickupId, viewer), [pickupId, viewer]);
  const [confirming, setConfirming] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const backTo = viewer === 'collector' ? '/collector' : '/pickups';

  async function accept() {
    setAccepting(true);
    try { await pickupService.accept(pickupId); toast.success('Pickup accepted.'); setConfirming(false); reload(); }
    catch (err) { toast.error(err.message); setConfirming(false); reload(); }
    finally { setAccepting(false); }
  }

  return (
    <>
      <Link to={backTo} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-forest"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{viewer === 'collector' ? 'Pickup queue' : 'My pickups'}</Link>
      {loading && !p && <LoadingSkeleton rows={2} className="h-48" />}
      {error && <ErrorState error={error} onRetry={reload} title="Couldn’t load this pickup" />}
      {p && (
        <>
          <PageHeader title={p.waste_item} description={`${p.pickup_id} · Requested ${formatDate(p.created_at)}`} actions={<StatusBadge status={p.status} />} />
          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <div className="space-y-6">
              <Card><h2 className="mb-4 text-base font-semibold">Progress</h2><PickupStatusTimeline status={p.status} />
                <p className="mt-4 text-sm text-muted">
                  {p.status === 'requested' && 'Waiting for a collector to accept this request.'}
                  {p.status === 'accepted' && 'A collector has accepted. Hand the items over and share the code at handover.'}
                  {p.status === 'collected' && 'Handover verified. This pickup is complete.'}
                  {p.status === 'cancelled' && 'This request will not be collected.'}
                </p>
              </Card>
              <Card>
                <h2 className="text-base font-semibold">Details</h2>
                <dl className="mt-2 divide-y divide-line">
                  <Row icon={Package} label="Category and quantity"><span className="flex flex-wrap items-center gap-2"><WasteCategoryBadge category={p.category} /> × {p.quantity}</span></Row>
                  <Row icon={MapPin} label="Location">{p.address}</Row>
                  {p.preferred_date && <Row icon={Calendar} label="Preferred date">{formatDate(p.preferred_date)}</Row>}
                  {p.instructions && <Row icon={StickyNote} label="Instructions">{p.instructions}</Row>}
                  <Row icon={UserRound} label="Collector">{p.collector?.name || 'Not assigned yet'}</Row>
                </dl>
              </Card>
            </div>

            <div className="space-y-6">
              {p.status === 'collected' && (
                <Card className="bg-sage">
                  <h2 className="text-base font-semibold">EcoPoints earned</h2>
                  <p className="mt-1 font-display text-3xl font-semibold text-forest">{typeof p.points_awarded === 'number' ? p.points_awarded : '—'}</p>
                  <p className="mt-1 text-sm text-muted">Confirmed by the server after verified handover.</p>
                </Card>
              )}
              {viewer === 'citizen' && p.status === 'accepted' && (
                <Card>
                  <h2 className="flex items-center gap-2 text-base font-semibold"><KeyRound className="h-4 w-4 text-moss" aria-hidden="true" />Handover code</h2>
                  {p.otp
                    ? <><p className="mt-3 font-display text-3xl font-semibold tracking-[0.3em] text-forest" aria-label={`Code ${p.otp.split('').join(' ')}`}>{p.otp}</p>
                        <p className="mt-2 text-sm text-muted">Share this only with the collector, in person, when you hand over the items.</p></>
                    : <p className="mt-2 text-sm text-muted">Your handover code isn’t available yet. Check again shortly.</p>}
                </Card>
              )}
              {viewer === 'collector' && p.status === 'requested' && (
                <Card><h2 className="text-base font-semibold">Accept this pickup</h2><p className="mt-1 text-sm text-muted">Accepting assigns it to you.</p>
                  <Button className="mt-4" onClick={() => setConfirming(true)}>Accept pickup</Button></Card>
              )}
              {viewer === 'collector' && p.status === 'accepted' && (
                <Card><h2 className="mb-1 text-base font-semibold">Verify handover</h2><p className="mb-4 text-sm text-muted">Ask the citizen for their code. The server confirms it.</p>
                  <OtpVerificationForm pickupId={p.pickup_id} onVerified={(r) => { toast.success(`Handover verified. ${r?.points_awarded ?? ''} EcoPoints awarded to the citizen.`); reload(); }} /></Card>
              )}
            </div>
          </div>
          <ConfirmDialog open={confirming} title="Accept this pickup?" description={`You’ll be responsible for collecting ${p.waste_item} from ${p.address}.`} confirmLabel="Accept pickup" loading={accepting} onConfirm={accept} onCancel={() => !accepting && setConfirming(false)} />
        </>
      )}
    </>
  );
}
