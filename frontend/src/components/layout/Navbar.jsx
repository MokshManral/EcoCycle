import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Logo from './Logo';
import Button from '../common/Button';

const LINKS = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#categories', label: 'Categories' },
  { href: '/#benefits', label: 'Who it’s for' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6" aria-label="Main">
        <Logo />
        <ul className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => <li key={l.href}><a href={l.href} className="text-sm text-muted hover:text-forest">{l.label}</a></li>)}
        </ul>
        <div className="hidden items-center gap-3 md:flex">
          <Button to="/dashboard" variant="ghost">Open demo</Button>
          <Button to="/scan">Identify waste</Button>
        </div>
        <button className="rounded-lg p-2 md:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? 'Close menu' : 'Open menu'}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>
      {open && (
        <div id="mobile-menu" className="border-t border-line bg-paper px-4 pb-4 md:hidden">
          <ul className="py-2">
            {LINKS.map((l) => <li key={l.href}><a href={l.href} onClick={() => setOpen(false)} className="block py-2.5 text-muted">{l.label}</a></li>)}
          </ul>
          <div className="flex gap-3"><Button to="/scan" className="flex-1">Identify waste</Button><Button to="/dashboard" variant="outline" className="flex-1">Open demo</Button></div>
        </div>
      )}
    </header>
  );
}
