import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router';
import { ApiError } from './lib/api.js';
import { AuthProvider, RequireAuth } from './auth/auth.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { Layout } from './components/Layout.jsx';
import { FullPageLoader } from './components/Skeleton.jsx';
import Login from './pages/Login.jsx';
import ResolveSlug from './pages/ResolveSlug.jsx';
import NotFound from './pages/NotFound.jsx';
import './index.css';

// Heavy pages (charts, Markdown editor) load on demand.
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const CaseStudiesList = lazy(() => import('./pages/CaseStudiesList.jsx'));
const CaseStudyEditor = lazy(() => import('./pages/editor/CaseStudyEditor.jsx'));
const Corrections = lazy(() => import('./pages/Corrections.jsx'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Don't retry auth/validation errors; retry network hiccups once.
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 1,
    },
  },
});

function Providers() {
  return (
    <AuthProvider>
      <Suspense fallback={<FullPageLoader />}>
        <Outlet />
      </Suspense>
    </AuthProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <Providers />,
    children: [
      { path: '/login', element: <Login /> },
      {
        element: (
          <RequireAuth>
            <Layout />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'case-studies', element: <CaseStudiesList /> },
          { path: 'case-studies/new', element: <CaseStudyEditor key="new" /> },
          { path: 'case-studies/:id/edit', element: <CaseStudyEditor /> },
          { path: 'case-studies/by-slug/:slug', element: <ResolveSlug /> },
          { path: 'corrections', element: <Corrections /> },
          { path: 'dashboard', element: <Navigate to="/" replace /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
