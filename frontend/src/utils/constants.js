import { CupSoda, FileText, Wine, Cog, Cpu, Leaf, AlertTriangle, Box } from 'lucide-react';

// Category values are assumed API values (see README "Assumed API schemas").
export const WASTE_CATEGORIES = {
  plastic: { label: 'Plastic', icon: CupSoda },
  paper: { label: 'Paper & cardboard', icon: FileText },
  glass: { label: 'Glass', icon: Wine },
  metal: { label: 'Metal', icon: Cog },
  'e-waste': { label: 'Electronics', icon: Cpu },
  organic: { label: 'Organic', icon: Leaf },
  hazardous: { label: 'Hazardous', icon: AlertTriangle },
  other: { label: 'Other', icon: Box },
};

export const PICKUP_STATUSES = ['requested', 'accepted', 'collected', 'cancelled'];

export const UPLOAD_RULES = {
  types: ['image/jpeg', 'image/png', 'image/webp'],
  maxBytes: 5 * 1024 * 1024,
  hint: 'JPG, PNG or WebP, up to 5 MB',
};

export const LOW_CONFIDENCE = 0.6;
