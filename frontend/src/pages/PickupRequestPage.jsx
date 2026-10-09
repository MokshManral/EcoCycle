import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Truck } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import ErrorState from '../components/common/ErrorState';
import StatusBadge from '../components/common/StatusBadge';
import { WASTE_CATEGORIES } from '../utils/constants';
import { validatePickup } from '../utils/validators';
import { todayISO } from '../utils/format';
import { pickupService } from '../services/pickupService';
import { useAnalysis } from '../context/AnalysisContext';
import { useToast } from '../context/ToastContext';

function Field({ id, label, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-sm text-clay">{error}</p>}
    </div>
  );
}

export default function PickupRequestPage() {
  const { analysis } = useAnalysis();
  const toast = useToast();
  const r = analysis?.result;
  const [values, setValues] = useState({
    waste_item: r?.item_name || '', category: r?.category || '', quantity: '1', address: '', preferred_date: '', instructions: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [created, setCreated] = useState(null);

  const set = (k) => (e) => { setValues((v) => ({ ...v, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };
  const aria = (k, hint) => ({ 'aria-invalid': Boolean(errors[k]), 'aria-describedby': errors[k] ? `${k}-err` : hint ? `${k}-hint` : undefined });

  async function submit(e) {
    e.preventDefault();
    if (submitting) return;
    const found = validatePickup(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSubmitting(true); setApiError(null);
    try {
      const payload = { ...values, quantity: Number(values.quantity), preferred_date: values.preferred_date || null };
      setCreated(await pickupService.create(payload));
      toast.success('Pickup request created.');
    } catch (err) {
      setApiError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <>
        <PageHeader title="Pickup requested" />
        <Card className="max-w-xl">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-moss" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold">We’ve received your request</h2>
              <p className="mt-1 text-sm text-muted">No collector has accepted it yet. You’ll see the status change here once one does.</p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 rounded-lg bg-sage-50 p-4 text-sm">
            <div><dt className="text-muted">Pickup ID</dt><dd className="font-display text-lg font-semibold">{created.pickup_id}</dd></div>
            <div><dt className="text-muted">Status</dt><dd className="mt-1"><StatusBadge status={created.status} /></dd></div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button to={`/pickups/${created.pickup_id}`}>View pickup</Button>
            <Button to="/pickups" variant="outline">All pickups</Button>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Request a pickup" description="Tell us what needs collecting and where. A collector will need to accept the request." />
      <Card className="max-w-2xl">
        <form onSubmit={submit} noValidate className="space-y-5">
          {apiError && <ErrorState error={apiError} title="Couldn’t create the pickup" />}
          <Field id="waste_item" label="Waste item" error={errors.waste_item}>
            <input id="waste_item" className={`input ${errors.waste_item ? 'input-error' : ''}`} value={values.waste_item} onChange={set('waste_item')} {...aria('waste_item')} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="category" label="Waste category" error={errors.category}>
              <select id="category" className={`input ${errors.category ? 'input-error' : ''}`} value={values.category} onChange={set('category')} {...aria('category')}>
                <option value="">Select a category</option>
                {Object.entries(WASTE_CATEGORIES).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
              </select>
            </Field>
            <Field id="quantity" label="Quantity (items)" error={errors.quantity}>
              <input id="quantity" type="number" min="1" step="1" inputMode="numeric" className={`input ${errors.quantity ? 'input-error' : ''}`} value={values.quantity} onChange={set('quantity')} {...aria('quantity')} />
            </Field>
          </div>
          <Field id="address" label="Pickup address or location description" error={errors.address}>
            <textarea id="address" rows={3} className={`input ${errors.address ? 'input-error' : ''}`} value={values.address} onChange={set('address')} {...aria('address')} />
          </Field>
          <Field id="preferred_date" label="Preferred pickup date (optional)" error={errors.preferred_date} hint="A collector may not be able to match this date.">
            <input id="preferred_date" type="date" min={todayISO()} className={`input max-w-xs ${errors.preferred_date ? 'input-error' : ''}`} value={values.preferred_date} onChange={set('preferred_date')} {...aria('preferred_date', true)} />
          </Field>
          <Field id="instructions" label="Instructions for the collector (optional)">
            <textarea id="instructions" rows={2} className="input" value={values.instructions} onChange={set('instructions')} />
          </Field>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button type="submit" size="lg" icon={Truck} loading={submitting}>{submitting ? 'Submitting…' : 'Submit pickup request'}</Button>
            <Link to="/pickups" className="text-sm text-muted hover:text-forest">Cancel</Link>
          </div>
        </form>
      </Card>
    </>
  );
}
