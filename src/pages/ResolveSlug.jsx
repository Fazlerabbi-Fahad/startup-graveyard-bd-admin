import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useParams } from 'react-router';
import { api } from '../lib/api.js';
import { FullPageLoader } from '../components/Skeleton.jsx';
import { EmptyState } from '../components/ui.jsx';

/** /case-studies/by-slug/:slug → redirect to the editor (corrections only know the slug). */
export default function ResolveSlug() {
  const { slug } = useParams();
  const { data, isPending } = useQuery({
    queryKey: ['case-study-by-slug', slug],
    queryFn: () => api('/admin/case-studies', { query: { slug, limit: 1 } }),
  });
  if (isPending) return <FullPageLoader />;
  const id = data?.items?.[0]?._id;
  if (id) return <Navigate to={`/case-studies/${id}/edit`} replace />;
  return (
    <div className="p-8">
      <EmptyState icon="alert" title="Case study not found" action={<Link to="/case-studies" className="text-sm font-medium text-accent-text underline">All case studies</Link>}>
        No case study uses the slug “{slug}”. It may have been renamed or deleted.
      </EmptyState>
    </div>
  );
}
