// In-memory mock backend. Resets on page refresh. Mirrors assumed pickup schema.
import { POINTS_PER_UNIT } from './waste';
import { ApiError } from '../services/api';

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const COLLECTOR = { id: 'col_demo', name: 'Demo Collector', phone: null };
const ADDR = 'Flat 12, Sample Residency, Demo Nagar';

let pickups = [
  { pickup_id: 'PK-1004', waste_item: 'Old laptop charger', category: 'e-waste', quantity: 2, address: ADDR, preferred_date: null, instructions: 'Call at the gate.', status: 'requested', created_at: daysAgo(0), collector: null, points_awarded: null },
  { pickup_id: 'PK-1003', waste_item: 'Glass jars', category: 'glass', quantity: 6, address: ADDR, preferred_date: null, instructions: '', status: 'accepted', created_at: daysAgo(2), collector: COLLECTOR, points_awarded: null, otp: '482913' },
  { pickup_id: 'PK-1002', waste_item: 'PET bottles', category: 'plastic', quantity: 10, address: ADDR, preferred_date: null, instructions: 'Bag is outside the door.', status: 'collected', created_at: daysAgo(9), collector: COLLECTOR, points_awarded: 120 },
  { pickup_id: 'PK-1001', waste_item: 'Cardboard boxes', category: 'paper', quantity: 5, address: ADDR, preferred_date: null, instructions: '', status: 'collected', created_at: daysAgo(16), collector: COLLECTOR, points_awarded: 30 },
];
let transactions = [
  { id: 'tx_2', pickup_id: 'PK-1002', points: 120, description: 'Verified pickup: PET bottles', created_at: daysAgo(8) },
  { id: 'tx_1', pickup_id: 'PK-1001', points: 30, description: 'Verified pickup: Cardboard boxes', created_at: daysAgo(15) },
];
let seq = 1005;
const wait = (ms = 450) => new Promise((r) => setTimeout(r, ms));
const clone = (x) => JSON.parse(JSON.stringify(x));
const find = (id) => {
  const p = pickups.find((x) => x.pickup_id === id);
  if (!p) throw new ApiError('Pickup not found.', { status: 404 });
  return p;
};
// Citizens may see the OTP only while a pickup is accepted. Collector views never receive it.
const view = (p, viewer) => {
  const out = clone(p);
  if (viewer !== 'citizen' || p.status !== 'accepted') delete out.otp;
  return out;
};

export const mockPickups = {
  async list(viewer = 'citizen') { await wait(); return pickups.map((p) => view(p, viewer)); },
  async get(id, viewer = 'citizen') { await wait(300); return view(find(id), viewer); },
  async create(payload) {
    await wait(700);
    const p = { pickup_id: `PK-${seq++}`, ...payload, preferred_date: payload.preferred_date || null, status: 'requested',
      created_at: new Date().toISOString(), collector: null, points_awarded: null };
    pickups = [p, ...pickups];
    return view(p, 'citizen');
  },
  async accept(id) {
    await wait();
    const p = find(id);
    if (p.status !== 'requested') throw new ApiError(`This pickup is already ${p.status}.`, { status: 409 });
    p.status = 'accepted';
    p.collector = COLLECTOR;
    p.otp = String(Math.floor(100000 + Math.random() * 900000));
    return view(p, 'collector');
  },
  async verify(id, otp) {
    await wait(700);
    const p = find(id);
    if (p.status === 'collected') throw new ApiError('This pickup was already verified. No additional points were awarded.', { status: 409 });
    if (p.status !== 'accepted') throw new ApiError('Only accepted pickups can be verified.', { status: 409 });
    if (otp !== p.otp) throw new ApiError('That code is incorrect. Check it with the citizen and try again.', { status: 400 });
    const points = (POINTS_PER_UNIT[p.category] ?? 5) * p.quantity;
    p.status = 'collected';
    p.points_awarded = points;
    delete p.otp;
    transactions = [{ id: `tx_${transactions.length + 1}`, pickup_id: p.pickup_id, points, description: `Verified pickup: ${p.waste_item}`, created_at: new Date().toISOString() }, ...transactions];
    return { pickup_id: p.pickup_id, status: 'collected', verified: true, points_awarded: points };
  },
  async points() {
    await wait(300);
    return { total_points: transactions.reduce((s, t) => s + t.points, 0), transactions: clone(transactions) };
  },
  async impact() {
    await wait(300);
    const done = pickups.filter((p) => p.status === 'collected');
    const byCat = {};
    done.forEach((p) => { byCat[p.category] = (byCat[p.category] || 0) + p.quantity; });
    return {
      completed_pickups: done.length,
      items_collected: done.reduce((s, p) => s + p.quantity, 0),
      category_breakdown: Object.entries(byCat).map(([category, count]) => ({ category, count })),
      recent_activity: clone(done.slice(0, 5)),
    };
  },
};
