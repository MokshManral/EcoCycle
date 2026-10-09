import Button from './Button';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-white/60 px-6 py-12 text-center">
      {Icon && <span className="mb-4 rounded-full bg-sage p-3 text-moss"><Icon className="h-6 w-6" aria-hidden="true" /></span>}
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-5"><Button to={action.to} onClick={action.onClick} icon={action.icon}>{action.label}</Button></div>}
    </div>
  );
}
