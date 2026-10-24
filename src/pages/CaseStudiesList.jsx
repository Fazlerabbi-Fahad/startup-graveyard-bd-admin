import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { publicCaseStudyUrl } from '../lib/api.js';
import { useCaseStudies, useDeleteCaseStudy, useStatusMutation } from '../lib/queries.js';
import { useDebounced } from '../lib/useDebounced.js';
import { formatDate, formatNumber } from '../lib/format.js';
import { describeMissing } from '../lib/fieldLabels.js';
import { useToast } from '../components/Toast.jsx';
import { Button, EmptyState, PageHeader, Segmented, StatusBadge } from '../components/ui.jsx';
import { TableSkeleton } from '../components/Skeleton.jsx';
import { ConfirmDeleteDialog } from '../components/Dialog.jsx';
import { Icon } from '../components/Icon.jsx';

const LIMIT = 20;
const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'published', label: 'Published' },
];

export default function CaseStudiesList() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const page = Number(params.get('page')) || 1;
  const [search, setSearch] = useState(params.get('q') ?? '');
  const q = useDebounced(search.trim(), 300);

  const update = (next) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) v ? p.set(k, v) : p.delete(k);
    setParams(p, { replace: true });
  };

  const query = useCaseStudies({ status: status || undefined, q: q || undefined, page, limit: LIMIT });
  const [toDelete, setToDelete] = useState(null);
  const statusMutation = useStatusMutation();
  const deleteMutation = useDeleteCaseStudy();
  const toast = useToast();
  const navigate = useNavigate();

  async function toggleStatus(item) {
    const action = item.status === 'published' ? 'unpublish' : 'publish';
    try {
      await statusMutation.mutateAsync({ id: item._id, action });
      toast.success(action === 'publish' ? 'Published' : 'Moved back to drafts', item.name);
    } catch (err) {
      if (err.missing?.length) {
        toast.error(`Can't publish “${item.name}” yet`, `Missing: ${describeMissing(err.missing)}. Open the editor to finish it.`);
      } else {
        toast.error('Status change failed', err.message);
      }
    }
  }

  async function confirmDelete() {
    try {
      await deleteMutation.mutateAsync(toDelete._id);
      toast.success('Deleted', toDelete.name);
      setToDelete(null);
    } catch (err) {
      toast.error('Delete failed', err.message);
    }
  }

  const data = query.data;
  const filtering = Boolean(q || status);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 xl:px-10">
      <PageHeader
        title="Case Studies"
        description={data ? `${formatNumber(data.total)} ${filtering ? 'matching' : 'in the archive'}` : ' '}
        actions={
          <Button variant="primary" icon="plus" onClick={() => navigate('/case-studies/new')}>
            New case study
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
          <input
            type="search"
            aria-label="Search case studies"
            placeholder="Search by name, tagline or summary"
            className="input pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              update({ q: e.target.value.trim(), page: '' });
            }}
          />
        </div>
        <Segmented label="Filter by status" value={status} onChange={(v) => update({ status: v, page: '' })} options={STATUS_OPTIONS} />
        {query.isFetching && !query.isPending && <span className="text-xs text-faint" role="status">Updating…</span>}
      </div>

      <div className="card overflow-hidden">
        {query.isPending ? (
          <TableSkeleton />
        ) : query.isError ? (
          <EmptyState icon="alert" title="Couldn't load case studies" action={<Button onClick={() => query.refetch()}>Try again</Button>}>
            {query.error.message}
          </EmptyState>
        ) : data.items.length === 0 ? (
          filtering ? (
            <EmptyState icon="search" title="No matches" action={<Button onClick={() => { setSearch(''); update({ q: '', status: '', page: '' }); }}>Clear filters</Button>}>
              Nothing matches the current search or status filter.
            </EmptyState>
          ) : (
            <EmptyState
              icon="edit"
              title="No case studies yet"
              action={
                <Button variant="primary" icon="plus" onClick={() => navigate('/case-studies/new')}>
                  Write the first one
                </Button>
              }
            >
              Each case study tells the story of one startup: what it did, what went wrong, and what founders can learn.
            </EmptyState>
          )
        ) : (
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2/60 text-left text-xs font-medium tracking-wide text-muted uppercase">
                <th scope="col" className="px-4 py-2.5 font-medium">Name</th>
                <th scope="col" className="w-28 px-4 py-2.5 font-medium">Sector</th>
                <th scope="col" className="w-28 px-4 py-2.5 font-medium">Status</th>
                <th scope="col" className="w-28 px-4 py-2.5 font-medium">Updated</th>
                <th scope="col" className="w-14 px-3 py-2.5 text-right font-medium">Views</th>
                <th scope="col" className="w-52 px-3 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const publicUrl = item.status === 'published' ? publicCaseStudyUrl(item.slug) : null;
                const busy = statusMutation.isPending && statusMutation.variables?.id === item._id;
                return (
                  <tr key={item._id} className="group border-b border-line last:border-0 hover:bg-surface-2/50">
                    <td className="px-4 py-3">
                      <Link to={`/case-studies/${item._id}/edit`} className="block truncate font-medium hover:text-accent-text">
                        {item.name}
                      </Link>
                      <p className="truncate font-mono text-xs text-faint">/{item.slug}</p>
                    </td>
                    <td className="truncate px-4 py-3 text-muted">{item.atAGlance?.sector ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="num px-4 py-3 text-xs whitespace-nowrap text-muted">{formatDate(item.updatedAt)}</td>
                    <td className="num px-3 py-3 text-right">{formatNumber(item.viewCount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="edit"
                          title="Edit"
                          aria-label={`Edit ${item.name}`}
                          onClick={() => navigate(`/case-studies/${item._id}/edit`)}
                        />
                        {publicUrl ? (
                          <a
                            href={publicUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="View on site"
                            className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-ink"
                          >
                            <Icon name="external" className="size-4" />
                            <span className="sr-only">View {item.name} on the public site (opens in a new tab)</span>
                          </a>
                        ) : (
                          <span className="inline-block size-8" aria-hidden="true" />
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={busy}
                          className="w-[6.25rem] justify-start"
                          icon={item.status === 'published' ? 'undo' : 'send'}
                          onClick={() => toggleStatus(item)}
                        >
                          {item.status === 'published' ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="trash"
                          title="Delete"
                          className="hover:!text-danger"
                          aria-label={`Delete ${item.name}`}
                          onClick={() => setToDelete(item)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm text-muted">
          <span className="num">
            Page {data.page} of {data.totalPages}
          </span>
          <div className="flex gap-2">
            <Button size="sm" icon="chevron-left" disabled={!data.hasPrevPage} onClick={() => update({ page: String(page - 1) })}>
              Previous
            </Button>
            <Button size="sm" disabled={!data.hasNextPage} onClick={() => update({ page: String(page + 1) })}>
              Next
              <Icon name="chevron-right" className="size-4" />
            </Button>
          </div>
        </nav>
      )}

      <ConfirmDeleteDialog
        open={Boolean(toDelete)}
        name={toDelete?.name}
        loading={deleteMutation.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
