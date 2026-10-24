import { Suspense } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth/auth.jsx';
import { useTheme } from '../lib/theme.js';
import { useCounts } from '../lib/queries.js';
import { Icon } from './Icon.jsx';
import { Skeleton } from './Skeleton.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/case-studies', label: 'Case Studies', icon: 'list', end: true },
  { to: '/case-studies/new', label: 'New Case Study', icon: 'plus' },
  { to: '/corrections', label: 'Corrections', icon: 'inbox', badge: 'corrections' },
];

const THEMES = [
  { value: 'light', icon: 'sun', label: 'Light theme' },
  { value: 'system', icon: 'monitor', label: 'System theme' },
  { value: 'dark', icon: 'moon', label: 'Dark theme' },
];

export function Layout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useTheme();
  const counts = useCounts();
  const newCorrections = counts.data?.newCorrections ?? 0;

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-line bg-surface">
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-6">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-on-accent" aria-hidden="true">
            <svg viewBox="0 0 32 32" className="size-5">
              <path d="M11 25V13a5 5 0 0 1 10 0v12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M8 25h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Startup Graveyard</p>
            <p className="text-xs text-muted">Admin</p>
          </div>
        </div>

        <nav aria-label="Main" className="flex-1 px-3">
          <ul className="space-y-0.5">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                      isActive ? 'bg-accent-soft font-medium text-accent-text' : 'text-muted hover:bg-surface-2 hover:text-ink'
                    }`
                  }
                >
                  <Icon name={item.icon} className="size-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge === 'corrections' && newCorrections > 0 && (
                    <span className="num rounded-full bg-accent px-1.5 text-[11px] leading-5 text-on-accent" aria-label={`${newCorrections} new`}>
                      {newCorrections}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-3 border-t border-line p-3">
          <div role="radiogroup" aria-label="Theme" className="flex rounded-md bg-surface-2 p-0.5">
            {THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={theme === t.value}
                aria-label={t.label}
                title={t.label}
                onClick={() => setTheme(t.value)}
                className={`grid flex-1 place-items-center rounded py-1.5 transition-colors ${
                  theme === t.value ? 'bg-surface text-ink shadow-sm' : 'text-faint hover:text-ink'
                }`}
              >
                <Icon name={t.icon} className="size-4" />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-1">
            <p className="min-w-0 flex-1 truncate text-xs text-muted" title={admin?.email}>
              {admin?.email}
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-ink"
            >
              <Icon name="logout" className="size-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main id="main" className="min-w-0 flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-6 py-8" role="status" aria-label="Loading">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
