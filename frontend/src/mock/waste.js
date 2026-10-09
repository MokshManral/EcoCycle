// Mock responses mirror the assumed /api/waste/analyze schema.
const CATALOG = {
  bottle: { item_name: 'PET plastic bottle', category: 'plastic', confidence: 0.94, hazard_warning: null,
    disposal_method: 'Empty, rinse and flatten. Keep the cap on and place in a dry-recyclables bin.',
    recycler: { name: 'Demo Plastics Recovery Centre', address: 'Sample Industrial Area, Block C' }, estimated_points: 12 },
  battery: { item_name: 'Household battery', category: 'hazardous', confidence: 0.88,
    hazard_warning: 'Batteries can leak or ignite. Do not put them in general waste. Tape the terminals of lithium cells.',
    disposal_method: 'Store in a dry container and hand over to a certified e-waste or battery collector.',
    recycler: { name: 'Demo E-Waste Handler', address: 'Sample Tech Park, Gate 2' }, estimated_points: 30 },
  can: { item_name: 'Aluminium drink can', category: 'metal', confidence: 0.91, hazard_warning: null,
    disposal_method: 'Rinse and crush lightly. Place with other dry metal recyclables.',
    recycler: { name: 'Demo Metal Recyclers', address: 'Sample Yard Road' }, estimated_points: 10 },
  box: { item_name: 'Cardboard box', category: 'paper', confidence: 0.52, hazard_warning: null,
    disposal_method: 'Flatten and keep dry. Remove tape and any plastic liners.', recycler: null, estimated_points: 6 },
  glass: { item_name: 'Glass jar', category: 'glass', confidence: 0.9, hazard_warning: 'Handle broken glass with gloves and wrap it before disposal.',
    disposal_method: 'Rinse, remove the lid and place in a glass collection bin.',
    recycler: { name: 'Demo Glass Works', address: 'Sample Depot Lane' }, estimated_points: 8 },
};
const KEYS = Object.keys(CATALOG);

export function mockAnalyze(file) {
  const name = (file?.name || '').toLowerCase();
  if (name.includes('unknown') || name.includes('blur')) {
    return { item_name: null, category: null, confidence: null, hazard_warning: null, disposal_method: null, recycler: null, estimated_points: null };
  }
  const hit = KEYS.find((k) => name.includes(k)) || KEYS[(file?.size || 0) % KEYS.length];
  return { ...CATALOG[hit] };
}

export const POINTS_PER_UNIT = { plastic: 12, paper: 6, glass: 8, metal: 10, 'e-waste': 30, organic: 4, hazardous: 30, other: 5 };
