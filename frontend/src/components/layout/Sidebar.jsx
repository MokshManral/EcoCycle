import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, ScanLine, Truck, BarChart3, ClipboardList, Inbox } from 'lucide-react';
import Logo from './Logo';
import LogoutButton from '../LogoutButton';

const NAV = {
  citizen: [
    { to: '/citizen', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/citizen/scan', label: 'Identify waste', icon: ScanLine },
    { to: '/citizen/pickups', label: 'My pickups', icon: Truck },
    { to: '/citizen/impact', label: 'EcoPoints & impact', icon: BarChart3 },
  ],
  collector: [{ to: '/collector', label: 'Pickup queue', icon: Inbox, end: true }],
  admin: [{ to: '/admin', label: 'Overview', icon: ClipboardList, end: true }],
};
const ROLES = [
  { key: 'citizen', label: 'Citizen', to: '/citizen' },
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

      <div className="space-y-3 border-t border-line pt-4">
        <LogoutButton />
      </div>
    </div>
  );
}
