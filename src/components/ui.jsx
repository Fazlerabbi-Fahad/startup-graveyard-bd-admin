import { forwardRef } from 'react';
import { Icon } from './Icon.jsx';

const VARIANTS = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover disabled:bg-accent/40 disabled:text-on-accent/80',
  secondary: 'border border-line bg-surface text-ink hover:bg-surface-2 hover:border-line-strong disabled:text-faint',
  ghost: 'text-muted hover:bg-surface-2 hover:text-ink disabled:text-faint',
  danger: 'bg-danger text-white hover:opacity-90 disabled:opacity-40',
};
const SIZES = {
  sm: 'h-8 px-2.5 text-sm gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
};

export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', icon, loading = false, className = '', children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex shrink-0 items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? <Spinner /> : icon ? <Icon name={icon} className="size-4" /> : null}
      {children}
    </button>
  );
});

export function Spinner({ className = 'size-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function StatusBadge({ status }) {
  const published = status === 'published';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        published ? 'bg-accent-soft text-accent-text' : 'bg-surface-2 text-muted'
      }`}
    >
      <span className={`size-1.5 rounded-full ${published ? 'bg-accent' : 'bg-faint'}`} aria-hidden="true" />
      {published ? 'Published' : 'Draft'}
    </span>
  );
}

export function EmptyState({ icon = 'inbox', title, children, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 grid size-10 place-items-center rounded-full bg-surface-2 text-muted">
        <Icon name={icon} className="size-5" />
      </div>
      <p className="font-medium">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Segmented control (radio group semantics). */
export function Segmented({ value, onChange, options, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line bg-surface p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`rounded px-3 py-1 text-sm transition-colors ${active ? 'bg-accent-soft font-medium text-accent-text' : 'text-muted hover:text-ink'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
