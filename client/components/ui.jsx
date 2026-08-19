'use client';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue/40 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';
  const variants = {
    primary: 'bg-blue text-white hover:bg-blue-deep shadow-sm',
    secondary: 'bg-foreground/10 text-foreground hover:bg-foreground/15',
    outline:
      'border border-hairline text-foreground hover:border-foreground/40 bg-transparent',
    ghost: 'text-foreground hover:bg-foreground/10',
    danger: 'bg-danger text-white hover:opacity-90',
    success: 'bg-success text-white hover:opacity-90',
  };
  const sizes = {
    sm: 'text-[13px] px-3.5 py-1.5',
    md: 'text-sm px-5 py-2.5',
    lg: 'text-[15px] px-7 py-3',
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-[13px] font-medium text-muted mb-1.5">{label}</span>}
      <input
        className={`w-full rounded-xl border border-hairline bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-blue/40 focus:border-blue transition ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export function Select({ label, error, className = '', children, ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-[13px] font-medium text-muted mb-1.5">{label}</span>}
      <select
        className={`w-full rounded-xl border border-hairline bg-card px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue/40 transition ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-[13px] font-medium text-muted mb-1.5">{label}</span>}
      <textarea
        className={`w-full rounded-xl border border-hairline bg-card px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue/40 transition resize-y ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export function Spinner({ className = 'size-5' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function Badge({ children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}

export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm anim-fade-in" onClick={onClose} />
      <div
        className={`relative w-full ${sizes[size]} max-h-[90vh] overflow-y-auto rounded-3xl border border-hairline bg-card p-6 shadow-2xl anim-scale-in`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-foreground/10"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center anim-fade-in">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-foreground/5 text-foreground/40">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {subtitle && <p className="mt-1 max-w-sm text-sm text-muted">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Prev
      </Button>
      <span className="px-3 text-sm text-muted">
        Page {page} of {pages}
      </span>
      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next
      </Button>
    </div>
  );
}
