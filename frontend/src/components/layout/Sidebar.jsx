import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, ScanLine, Truck, BarChart3, ClipboardList, ShieldCheck, Inbox } from 'lucide-react';
import Logo from './Logo';

const NAV = {
  citizen: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/scan', label: 'Identify waste', icon: ScanLine },
    { to: '/pickups', label: 'My pickups', icon: Truck },
    { to: '/impact', label: 'EcoPoints & impact', icon: BarChart3 },
  ],
  collector: [{ to: '/collector', label: 'Pickup queue', icon: Inbox, end: true }],
  admin: [{ to: '/admin', label: 'Overview', icon: ClipboardList, end: true }],
};
const ROLES = [
  { key: 'citizen', label: 'Citizen', to: '/dashboard' },
  { key: 'collector', label: 'Collector', to: '/collector' },
  { key: 'admin', label: 'Admin', to: '/admin' },
];

export default function Sidebar({ role, onNavigate }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="px-2 pt-1"><Logo to="/" /></div>
      <nav aria-label="Primary" className="flex-1">
        <ul className="space-y-1">
          {NAV[role].map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} onClick={onNavigate}
                className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-forest text-white' : 'text-ink hover:bg-sage'}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />{label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="rounded-lg bg-sage-50 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />Demo view (no sign-in)</p>
        <div className="flex gap-1" role="group" aria-label="Switch demo role">
          {ROLES.map((r) => (
            <Link key={r.key} to={r.to} onClick={onNavigate} aria-current={r.key === role ? 'true' : undefined}
              className={`flex-1 rounded-md px-2 py-1.5 text-center text-xs font-medium ${r.key === role ? 'bg-white text-forest shadow-card' : 'text-muted hover:text-forest'}`}>
              {r.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
