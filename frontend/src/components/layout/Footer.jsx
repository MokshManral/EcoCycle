import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="bg-forest-900 text-sage">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo light />
          <p className="mt-3 max-w-sm text-sm text-sage/80">Identify waste, find responsible disposal options and earn EcoPoints once a collection is verified.</p>
        </div>
        <nav aria-label="Product">
          <h2 className="mb-3 font-sans text-sm font-semibold text-white">Product</h2>
          <ul className="space-y-2 text-sm text-sage/80">
            <li><Link to="/scan" className="hover:text-white">Identify waste</Link></li>
            <li><Link to="/pickups" className="hover:text-white">Track pickups</Link></li>
            <li><Link to="/impact" className="hover:text-white">EcoPoints &amp; impact</Link></li>
          </ul>
        </nav>
        <nav aria-label="Demo views">
          <h2 className="mb-3 font-sans text-sm font-semibold text-white">Demo views</h2>
          <ul className="space-y-2 text-sm text-sage/80">
            <li><Link to="/dashboard" className="hover:text-white">Citizen</Link></li>
            <li><Link to="/collector" className="hover:text-white">Collector</Link></li>
            <li><Link to="/admin" className="hover:text-white">Admin</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-sage/60">EcoCycle is a project prototype. Statistics shown are demo values.</div>
    </footer>
  );
}
