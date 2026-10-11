import { ScanLine, Lightbulb, Truck, BadgeCheck, Home, Route, Info, Sparkles, CupSoda } from 'lucide-react';
import Button from '../components/common/Button';
import WasteCategoryBadge from '../components/common/WasteCategoryBadge';
import { WASTE_CATEGORIES } from '../utils/constants';
import { LANDING_DEMO_STATS } from '../mock/dashboard';

const STEPS = [
  { icon: ScanLine, title: 'Identify', text: 'Photograph an item. EcoCycle suggests what it is and which waste category it belongs to.' },
  { icon: Lightbulb, title: 'Recommend', text: 'Get disposal guidance, safety warnings and a suitable recycler when one is available.' },
  { icon: Truck, title: 'Collect', text: 'Request a pickup and follow it from requested to accepted to collected.' },
  { icon: BadgeCheck, title: 'Earn', text: 'EcoPoints are added only after the collector’s handover is verified with a one-time code.' },
];

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-label="Example of an EcoCycle analysis result">
      <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
        <div className="relative flex h-56 items-center justify-center overflow-hidden rounded-xl bg-sage">
          <span className="scan-corner left-4 top-4 rounded-tl-md border-l-2 border-t-2" />
          <span className="scan-corner right-4 top-4 rounded-tr-md border-r-2 border-t-2" />
          <span className="scan-corner bottom-4 left-4 rounded-bl-md border-b-2 border-l-2" />
          <span className="scan-corner bottom-4 right-4 rounded-br-md border-b-2 border-r-2" />
          <CupSoda className="h-24 w-24 text-forest/70" strokeWidth={1.25} aria-hidden="true" />
          <div className="scanline absolute inset-x-6 h-0.5 bg-moss shadow-[0_0_12px_#2F6B4F]" aria-hidden="true" />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div><p className="font-display text-lg font-semibold text-forest">PET plastic bottle</p><p className="text-xs text-muted">AI confidence 94%</p></div>
          <WasteCategoryBadge category="plastic" />
        </div>
        <p className="mt-3 text-sm text-ink/80">Rinse, flatten and keep the cap on. Place in a dry-recyclables bin or request a pickup.</p>
        <div className="mt-4 flex items-start gap-2 rounded-lg border-2 border-dashed border-moss/50 bg-sage-50 p-3 text-sm">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-moss" aria-hidden="true" />
          <p><span className="font-medium text-forest">Up to 12 EcoPoints (estimated).</span> <span className="text-muted">Earned only after verified handover.</span></p>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted">Illustrative example, not a real scan.</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h1 className="text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">Turn Waste Into a Better Future.</h1>
          <p className="mt-5 max-w-xl text-lg text-muted">Identify waste, discover responsible disposal options, and make every verified collection count.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button to="/citizen/scan" size="lg" icon={ScanLine}>Identify waste</Button>
            <Button to="/collector" size="lg" variant="outline">See the collector view</Button>
          </div>
        </div>
        <HeroPreview />
      </section>

      <section id="how-it-works" className="scroll-mt-20 border-y border-line bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-semibold">How EcoCycle works</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-forest text-white"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <h3 className="mt-4 text-lg font-semibold"><span className="text-muted">{i + 1}. </span>{title}</h3>
                <p className="mt-1.5 text-sm text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-semibold">Waste categories EcoCycle recognizes</h2>
        <p className="mt-2 max-w-xl text-muted">Each result includes disposal guidance. Hazardous items also get a safety warning.</p>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(WASTE_CATEGORIES).map(([key, { label, icon: Icon }]) => (
            <li key={key} className="flex items-center gap-3 rounded-xl border border-line bg-white p-4">
              <span className="rounded-lg bg-sage p-2 text-moss"><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <span className="text-sm font-medium">{label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="benefits" className="scroll-mt-20 bg-sage-50 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-2">
          <div className="rounded-xl bg-white p-6 shadow-card">
            <Home className="h-6 w-6 text-moss" aria-hidden="true" />
            <h3 className="mt-3 text-xl font-semibold">For citizens</h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted">
              <li>Know what an item is and how to dispose of it safely.</li>
              <li>Request a pickup without searching for a recycler.</li>
              <li>See exactly where each pickup stands.</li>
              <li>Earn EcoPoints that reflect verified collections only.</li>
            </ul>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-card">
            <Route className="h-6 w-6 text-moss" aria-hidden="true" />
            <h3 className="mt-3 text-xl font-semibold">For collectors</h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted">
              <li>See incoming requests with category and location.</li>
              <li>Accept pickups and keep track of assigned ones.</li>
              <li>Confirm handover with a one-time code from the citizen.</li>
              <li>Keep a history of completed collections.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-labelledby="stats-h">
        <h2 id="stats-h" className="text-3xl font-semibold">EcoCycle at a glance</h2>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted"><Info className="h-4 w-4" aria-hidden="true" />Demo values for illustration only. They are not real usage figures.</p>
        <dl className="mt-8 grid gap-4 sm:grid-cols-3">
          {LANDING_DEMO_STATS.map((s) => (
            <div key={s.label} className="rounded-xl border border-line bg-white p-6">
              <dd className="font-display text-4xl font-semibold text-forest">{s.value}</dd>
              <dt className="mt-1 text-sm text-muted">{s.label} (demo)</dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-2xl bg-forest px-6 py-12 text-center sm:px-12">
          <h2 className="text-3xl font-semibold text-white">Start with one item.</h2>
          <p className="mx-auto mt-3 max-w-lg text-sage/85">Upload a photo and see what EcoCycle suggests. Nothing counts toward points until a collection is verified.</p>
          <div className="mt-6 flex justify-center"><Button to="/citizen/scan" size="lg" variant="secondary" icon={ScanLine}>Identify waste</Button></div>
        </div>
      </section>
    </>
  );
}
