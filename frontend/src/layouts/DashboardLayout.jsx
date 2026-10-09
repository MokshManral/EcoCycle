import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Logo from '../components/layout/Logo';
import DemoBanner from '../components/common/DemoBanner';

export default function DashboardLayout({ role }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:p-2">Skip to content</a>
      <aside className="sticky top-0 hidden h-screen border-r border-line bg-white lg:block"><Sidebar role={role} /></aside>
      <div className="min-w-0">
        <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
          <Logo to="/" />
          <button onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="rounded-lg p-2"><Menu className="h-6 w-6" /></button>
        </div>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-3 rounded-lg p-2"><X className="h-5 w-5" /></button>
              <Sidebar role={role} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        )}
        <DemoBanner />
        <main id="main" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10"><Outlet /></main>
      </div>
    </div>
  );
}
