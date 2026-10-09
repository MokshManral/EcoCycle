export default function Card({ as: Tag = 'div', className = '', padded = true, children, ...rest }) {
  return <Tag className={`rounded-xl border border-line bg-white shadow-card ${padded ? 'p-5 sm:p-6' : ''} ${className}`} {...rest}>{children}</Tag>;
}
