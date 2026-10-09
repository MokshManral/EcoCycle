import { WASTE_CATEGORIES } from '../../utils/constants';

export default function WasteCategoryBadge({ category }) {
  const c = WASTE_CATEGORIES[category] || WASTE_CATEGORIES.other;
  const Icon = c.icon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sage px-2.5 py-1 text-xs font-medium text-forest">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />{c.label}
    </span>
  );
}
