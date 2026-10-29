import { useSearchParams } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { keys } from '../lib/queries.js';
import { formatDateTime, timeAgo } from '../lib/format.js';
import { useToast } from '../components/Toast.jsx';
import { Button, EmptyState, PageHeader, Segmented } from '../components/ui.jsx';
import { Skeleton } from '../components/Skeleton.jsx';

const LIMIT = 20;
const FILTERS = [
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'all', label: 'All' },
];
const KIND_LABELS = { suggestion: 'Startup suggestion', contact: 'Message' };

export default function Messages() {
  const [params, setParams] = useSearchParams();
  const status = FILTERS.some((f) => f.value === params.get('status')) ? params.get('status') : 'new';
  const page = Number(params.get('page')) || 1;
  const queryParams = { status: status === 'all' ? undefined : status, page, limit: LIMIT };

  const qc = useQueryClient();
  const toast = useToast();
  const list = useQuery({
    queryKey: keys.messages(queryParams),
    queryFn: ({ signal }) => api('/admin/messages', { query: queryParams, signal }),
    placeholderData: keepPreviousData,
  });

  const update = useMutation({
    mutationFn: ({ id, status: next }) => api(`/admin/messages/${id}`, { method: 'PATCH', body: { status: next } }),
    onSuccess: (doc) => {
      toast.success(doc.status === 'read' ? 'Marked as read' : 'Moved back to new');
      qc.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (err) => toast.error('Update failed', err.message),
  });

  const setFilter = (v) => setParams({ status: v }, { replace: true });
  const data = list.data;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 xl:px-10">
      <PageHeader
        title="Messages"
        description="Startup suggestions and messages sent from the public Contact page."
        actions={<Segmented label="Filter by status" value={status} onChange={setFilter} options={FILTERS} />}
      />

      {list.isPending ? (
        <div className="space-y-3" role="status" aria-label="Loading messages">
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
          <EmptyState icon="alert" title="Couldn’t load messages" action={<Button onClick={() => list.refetch()}>Try again</Button>}>
            {list.error.message}
          </EmptyState>
        </div>
      ) : data.items.length === 0 ? (
        <div className="card">
          <EmptyState icon="inbox" title={status === 'new' ? 'Inbox zero' : 'No messages here'}>
            {status === 'new'
              ? 'No new messages. Suggestions and messages from the Contact page appear here.'
              : 'Messages from the Contact page will appear here.'}
          </EmptyState>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.items.map((m) => {
            const busy = update.isPending && update.variables?.id === m._id;
            const read = m.status === 'read';
            return (
              <li key={m._id} className={`card p-4 ${read ? 'opacity-75' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">{KIND_LABELS[m.kind] ?? m.kind}</span>
                      {read && <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">Read</span>}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {m.name || 'Anonymous'}
                      {' · '}
                      <a href={`mailto:${m.email}`} className="hover:text-ink hover:underline">
                        {m.email}
                      </a>
                      {' · '}
                      <time dateTime={m.createdAt} title={formatDateTime(m.createdAt)}>
                        {timeAgo(m.createdAt)}
                      </time>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={read ? 'ghost' : 'primary'}
                    icon={read ? 'undo' : 'check'}
                    loading={busy}
                    onClick={() => update.mutate({ id: m._id, status: read ? 'new' : 'read' })}
                  >
                    {read ? 'Mark new' : 'Mark read'}
                  </Button>
                </div>
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">{m.message}</p>
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
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
