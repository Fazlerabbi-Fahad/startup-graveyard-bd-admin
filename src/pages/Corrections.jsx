import { Link, useSearchParams } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { keys } from '../lib/queries.js';
import { formatDateTime, timeAgo } from '../lib/format.js';
import { useToast } from '../components/Toast.jsx';
import { Button, EmptyState, PageHeader, Segmented } from '../components/ui.jsx';
import { Skeleton } from '../components/Skeleton.jsx';
import { Icon } from '../components/Icon.jsx';

const LIMIT = 20;
const FILTERS = [
  { value: 'new', label: 'New' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All' },
];

export default function Corrections() {
  const [params, setParams] = useSearchParams();
  const status = FILTERS.some((f) => f.value === params.get('status')) ? params.get('status') : 'new';
  const page = Number(params.get('page')) || 1;
  const queryParams = { status: status === 'all' ? undefined : status, page, limit: LIMIT };

  const qc = useQueryClient();
  const toast = useToast();
  const list = useQuery({
    queryKey: keys.corrections(queryParams),
    queryFn: ({ signal }) => api('/admin/corrections', { query: queryParams, signal }),
    placeholderData: keepPreviousData,
  });

  const update = useMutation({
    mutationFn: ({ id, status: next }) => api(`/admin/corrections/${id}`, { method: 'PATCH', body: { status: next } }),
    onSuccess: (doc) => {
      toast.success(doc.status === 'resolved' ? 'Marked as resolved' : 'Moved back to new');
      qc.invalidateQueries({ queryKey: ['corrections'] });
      qc.invalidateQueries({ queryKey: keys.counts });
    },
    onError: (err) => toast.error('Update failed', err.message),
  });

  const setFilter = (v) => setParams({ status: v }, { replace: true });
  const data = list.data;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 xl:px-10">
      <PageHeader
        title="Corrections"
        description="Fixes and extra facts sent in by readers from the public site."
        actions={<Segmented label="Filter by status" value={status} onChange={setFilter} options={FILTERS} />}
      />

      {list.isPending ? (
        <div className="space-y-3" role="status" aria-label="Loading corrections">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="card space-y-3 p-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : list.isError ? (
        <div className="card">
          <EmptyState icon="alert" title="Couldn’t load corrections" action={<Button onClick={() => list.refetch()}>Try again</Button>}>
            {list.error.message}
          </EmptyState>
        </div>
      ) : data.items.length === 0 ? (
        <div className="card">
          <EmptyState icon="inbox" title={status === 'new' ? 'Inbox zero' : status === 'resolved' ? 'Nothing resolved yet' : 'No corrections yet'}>
            {status === 'new'
              ? 'No new corrections. When readers report a mistake on a case study, it shows up here.'
              : 'Corrections readers send from the public site will appear here.'}
          </EmptyState>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.items.map((c) => {
            const busy = update.isPending && update.variables?.id === c._id;
            const resolved = c.status === 'resolved';
            return (
              <li key={c._id} className={`card p-4 ${resolved ? 'opacity-75' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="text-muted">On </span>
                      <Link to={`/case-studies/by-slug/${c.caseStudySlug}`} className="font-medium hover:text-accent-text hover:underline">
                        {c.caseStudySlug}
                      </Link>
                      {resolved && <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">Resolved</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {c.name || 'Anonymous'}
                      {c.email && (
                        <>
                          {' · '}
                          <a href={`mailto:${c.email}`} className="hover:text-ink hover:underline">
                            {c.email}
                          </a>
                        </>
                      )}
                      {' · '}
                      <time dateTime={c.createdAt} title={formatDateTime(c.createdAt)}>
                        {timeAgo(c.createdAt)}
                      </time>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      to={`/case-studies/by-slug/${c.caseStudySlug}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted hover:bg-surface-2 hover:text-ink"
                    >
                      <Icon name="edit" className="size-4" />
                      Edit case study
                    </Link>
                    <Button
                      size="sm"
                      variant={resolved ? 'ghost' : 'primary'}
                      icon={resolved ? 'undo' : 'check'}
                      loading={busy}
                      onClick={() => update.mutate({ id: c._id, status: resolved ? 'new' : 'resolved' })}
                    >
                      {resolved ? 'Reopen' : 'Mark resolved'}
                    </Button>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">{c.message}</p>
              </li>
            );
          })}
        </ul>
      )}

      {data && data.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm text-muted">
          <span className="num">
            Page {data.page} of {data.totalPages}
          </span>
          <div className="flex gap-2">
            <Button size="sm" icon="chevron-left" disabled={!data.hasPrevPage} onClick={() => setParams({ status, page: String(page - 1) })}>
              Previous
            </Button>
            <Button size="sm" disabled={!data.hasNextPage} onClick={() => setParams({ status, page: String(page + 1) })}>
              Next
              <Icon name="chevron-right" className="size-4" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
