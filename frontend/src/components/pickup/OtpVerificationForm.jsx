import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import Button from '../common/Button';
import { validateOtp } from '../../utils/validators';
import { pickupService } from '../../services/pickupService';

// The frontend never decides success: it only reports what the backend returned.
export default function OtpVerificationForm({ pickupId, onVerified }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const v = validateOtp(otp);
    if (v) { setError(v); return; }
    setBusy(true); setError('');
    try {
      const res = await pickupService.verify(pickupId, otp);
      setOtp('');
      onVerified?.(res);
    } catch (err) {
      setError(err.message || 'Verification failed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <div>
        <label htmlFor={`otp-${pickupId}`} className="label">Handover code from the citizen</label>
        <input id={`otp-${pickupId}`} className={`input max-w-[12rem] text-center font-display text-xl tracking-[0.35em] ${error ? 'input-error' : ''}`}
          inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} placeholder="••••••"
          onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
          aria-invalid={Boolean(error)} aria-describedby={error ? `otp-err-${pickupId}` : undefined} disabled={busy} />
        {error && <p id={`otp-err-${pickupId}`} role="alert" className="mt-2 text-sm text-clay">{error}</p>}
      </div>
      <Button type="submit" icon={ShieldCheck} loading={busy}>Verify handover</Button>
    </form>
  );
}
