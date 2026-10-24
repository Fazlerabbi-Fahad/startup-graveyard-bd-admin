import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useLocation } from 'react-router';
import { api, ApiError, UNAUTHORIZED_EVENT } from '../lib/api.js';
import { keys } from '../lib/queries.js';
import { FullPageLoader } from '../components/Skeleton.jsx';

const AuthContext = createContext(null);

async function fetchMe() {
  try {
    const data = await api('/auth/me', { silent401: true });
    return data.admin;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: keys.me, queryFn: fetchMe, retry: 1, staleTime: 5 * 60 * 1000 });

  const signOutLocally = useCallback(() => {
    // Drop every cached admin response, keep only the "logged out" state.
    qc.cancelQueries();
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' && q.queryKey[0] !== 'taxonomies' });
    qc.setQueryData(keys.me, null);
  }, [qc]);

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, signOutLocally);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, signOutLocally);
  }, [signOutLocally]);

  const value = useMemo(
    () => ({
      admin: me.data ?? null,
      isLoading: me.isPending,
      error: me.error,
      async login(email, password) {
        const data = await api('/auth/login', { method: 'POST', body: { email, password }, silent401: true });
        qc.setQueryData(keys.me, data.admin);
        return data.admin;
      },
      async logout() {
        try {
          await api('/auth/logout', { method: 'POST', silent401: true });
        } finally {
          signOutLocally();
        }
      },
    }),
    [me.data, me.isPending, me.error, qc, signOutLocally],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function RequireAuth({ children }) {
  const { admin, isLoading, error } = useAuth();
  const location = useLocation();
  if (isLoading) return <FullPageLoader />;
  if (error && !admin) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="card max-w-md p-6 text-center">
          <h1 className="text-lg font-semibold">Can't reach the API</h1>
          <p className="mt-2 text-sm text-muted">{error.message}</p>
          <button type="button" className="mt-4 text-sm font-medium text-accent-text underline" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }
  if (!admin) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}
