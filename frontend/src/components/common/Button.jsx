import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-forest text-white hover:bg-forest-700 disabled:bg-forest/40',
  secondary: 'bg-sage text-forest hover:bg-sage-200 disabled:opacity-50',
  outline: 'border border-line bg-white text-forest hover:bg-sage-50 disabled:opacity-50',
  ghost: 'text-forest hover:bg-sage disabled:opacity-50',
  danger: 'bg-clay text-white hover:bg-clay/90 disabled:opacity-50',
};
const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' };

export default function Button({ variant = 'primary', size = 'md', to, loading = false, disabled, icon: Icon, children, className = '', type = 'button', ...rest }) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`;
  const content = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
      {children}
    </>
  );
  if (to && !disabled) return <Link to={to} className={cls} {...rest}>{content}</Link>;
  return <button type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>{content}</button>;
}
