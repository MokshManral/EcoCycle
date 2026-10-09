import { Link } from 'react-router-dom';

export default function Logo({ to = '/', light = false }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 font-display text-xl font-semibold" aria-label="EcoCycle home">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill={light ? '#E6EEE3' : '#17382B'} />
        <path d="M16 7a9 9 0 1 0 9 9" fill="none" stroke={light ? '#17382B' : '#B9D8B0'} strokeWidth="3" strokeLinecap="round" />
        <path d="M21 5l4 4-4 4" fill="none" stroke={light ? '#17382B' : '#B9D8B0'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={light ? 'text-white' : 'text-forest'}>EcoCycle</span>
    </Link>
  );
}
