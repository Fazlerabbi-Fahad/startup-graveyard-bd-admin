import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/auth.jsx';
import { Button } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { FullPageLoader } from '../components/Skeleton.jsx';

export default function Login() {
  const { admin, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from && location.state.from !== '/login' ? location.state.from : '/';

  if (isLoading) return <FullPageLoader />;
  if (admin) return <Navigate to={from} replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.status === 429 ? err.message : err.status === 401 ? 'Incorrect email or password.' : err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-accent text-on-accent" aria-hidden="true">
            <svg viewBox="0 0 32 32" className="size-5">
              <path d="M11 25V13a5 5 0 0 1 10 0v12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M8 25h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </span>
          <div className="leading-tight">
            <p className="font-semibold">Startup Graveyard</p>
            <p className="text-sm text-muted">Admin sign in</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4 p-6" noValidate>
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger">
              <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              autoFocus
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" variant="primary" className="w-full" loading={submitting} disabled={!email || !password}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
