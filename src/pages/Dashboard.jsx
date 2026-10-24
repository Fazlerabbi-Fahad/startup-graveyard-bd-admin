import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api.js';
import { keys, useCounts } from '../lib/queries.js';
import { formatNumber } from '../lib/format.js';
import { useCssVars } from '../lib/useCssVars.js';
import { Button, EmptyState, PageHeader, Segmented } from '../components/ui.jsx';
import { Skeleton } from '../components/Skeleton.jsx';
import { Icon } from '../components/Icon.jsx';

const RANGES = [
  { value: '7d', label: '7 days' },
  { value: '28d', label: '28 days' },
  { value: '90d', label: '90 days' },
];

const shortDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const longDate = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const parseDay = (d) => new Date(`${d}T00:00:00Z`);

export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const range = RANGES.some((r) => r.value === params.get('range')) ? params.get('range') : '28d';
  const analytics = useQuery({
    queryKey: keys.analytics(range),
    queryFn: ({ signal }) => api('/admin/analytics', { query: { range }, signal }),
    placeholderData: (prev) => prev,
  });
  const counts = useCounts();
  const data = analytics.data;
  const ga4 = data?.ga4;
  const ga4Loading = analytics.isPending;
  const rangeLabel = RANGES.find((r) => r.value === range).label;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 xl:px-10">
      <PageHeader
        title="Dashboard"
        description={`Visitors over the last ${rangeLabel}, and the state of the archive.`}
        actions={<Segmented label="Date range" value={range} onChange={(v) => setParams({ range: v }, { replace: true })} options={RANGES} />}
      />

      {analytics.isError && (
        <div role="alert" className="mb-6 flex items-center gap-3 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
          <Icon name="alert" className="size-4 shrink-0" />
          <p className="flex-1">Couldn’t load analytics: {analytics.error.message}</p>
          <Button size="sm" onClick={() => analytics.refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* Stat tiles */}
      <section aria-label="Key numbers" className="mb-6 grid grid-cols-3 gap-3 xl:grid-cols-6">
        <Stat label="Users" value={ga4?.totals.users} loading={ga4Loading} unavailable={!ga4Loading && !ga4} />
        <Stat label="Sessions" value={ga4?.totals.sessions} loading={ga4Loading} unavailable={!ga4Loading && !ga4} />
        <Stat label="Page views" value={ga4?.totals.pageViews} loading={ga4Loading} unavailable={!ga4Loading && !ga4} />
        <Stat label="Published" value={counts.data?.published} loading={counts.isPending} to="/case-studies?status=published" />
        <Stat label="Drafts" value={counts.data?.drafts} loading={counts.isPending} to="/case-studies?status=draft" />
        <Stat label="New corrections" value={counts.data?.newCorrections} loading={counts.isPending} to="/corrections" highlight={counts.data?.newCorrections > 0} />
      </section>

      {!ga4Loading && !ga4 && data && <Ga4Notice reason={data.reason} />}

      {(ga4Loading || ga4) && (
        <section className="card mb-6 p-5" aria-labelledby="daily-users-title">
          <DailyUsers series={ga4?.dailyUsers} loading={ga4Loading} rangeLabel={rangeLabel} />
        </section>
      )}

      <div className="grid grid-cols-2 gap-6">
        <RankTable
          title="Top case studies"
          subtitle="All-time views counted on the site"
          loading={analytics.isPending}
          rows={(data?.topCaseStudies ?? []).map((c) => ({
            key: c._id,
            label: (
              <Link to={`/case-studies/${c._id}/edit`} className="hover:text-accent-text">
                {c.name}
              </Link>
            ),
            value: c.viewCount,
          }))}
          valueLabel="Views"
          empty="No views recorded yet. Views are counted when readers open a published case study."
        />
        {ga4 && (
          <>
            <RankTable
              title="Top pages"
              subtitle={`Page views, last ${rangeLabel}`}
              rows={ga4.topPages.map((p) => ({ key: p.path, label: <span className="font-mono text-[13px]">{p.path}</span>, value: p.views }))}
              valueLabel="Views"
              empty="No page views in this range."
            />
            <RankTable
              title="Top countries"
              subtitle={`Users, last ${rangeLabel}`}
              rows={ga4.topCountries.map((c) => ({ key: c.country, label: c.country || '(not set)', value: c.users }))}
              valueLabel="Users"
              empty="No visitors in this range."
            />
            <RankTable
              title="Top traffic sources"
              subtitle={`Sessions by source / medium, last ${rangeLabel}`}
              rows={ga4.topSources.map((s) => ({ key: s.source, label: s.source || '(direct)', value: s.sessions }))}
              valueLabel="Sessions"
              empty="No sessions in this range."
            />
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, loading, unavailable, to, highlight }) {
  const body = (
    <>
      <p className="text-xs text-muted">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-16" />
      ) : (
        <p className={`num mt-1 text-2xl font-medium tracking-tight ${unavailable ? 'text-faint' : highlight ? 'text-accent-text' : ''}`}>
          {unavailable ? '—' : formatNumber(value ?? 0)}
        </p>
      )}
      {unavailable && <p className="mt-0.5 text-[11px] text-faint">GA4 not connected</p>}
    </>
  );
  return to ? (
    <Link to={to} className="card block px-4 py-3.5 transition-colors hover:border-line-strong">
      {body}
    </Link>
  ) : (
    <div className="card px-4 py-3.5">{body}</div>
  );
}

function Ga4Notice({ reason }) {
  const notConfigured = reason === 'not configured';
  return (
    <section className="card mb-6 flex gap-4 p-5" aria-labelledby="ga4-notice-title">
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
        <Icon name="chart" className="size-5" />
      </div>
      <div className="text-sm">
        <h2 id="ga4-notice-title" className="font-semibold">
          {notConfigured ? 'Visitor analytics aren’t connected yet' : 'Google Analytics didn’t respond'}
        </h2>
        {notConfigured ? (
          <p className="mt-1 max-w-2xl text-muted">
            Users, sessions, page views and traffic sources come from Google Analytics 4. To turn them on, set{' '}
            <code className="rounded bg-surface-2 px-1 font-mono text-xs">GA4_PROPERTY_ID</code> and{' '}
            <code className="rounded bg-surface-2 px-1 font-mono text-xs">GOOGLE_SERVICE_ACCOUNT_JSON</code> on the API and add the service account as a Viewer on the
            GA4 property (see the API README). Case study views and the archive numbers below work without it.
          </p>
        ) : (
          <>
            <p className="mt-1 max-w-2xl text-muted">
              The API is configured for GA4 but the request failed. Check that the service account has Viewer access to the property and the property ID is right. Case
              study numbers below still work.
            </p>
            <p className="mt-2 font-mono text-xs break-all text-faint">{reason}</p>
          </>
        )}
      </div>
    </section>
  );
}

function DailyUsers({ series, loading, rangeLabel }) {
  const [asTable, setAsTable] = useState(false);
  const c = useCssVars(['chart-1', 'chart-grid', 'muted', 'surface', 'border']);
  const total = (series ?? []).reduce((n, d) => n + d.users, 0);

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 id="daily-users-title" className="text-sm font-semibold">
            Daily users
          </h2>
          <p className="text-xs text-muted">Last {rangeLabel}</p>
        </div>
        <Button size="sm" variant="ghost" icon={asTable ? 'chart' : 'list'} onClick={() => setAsTable((v) => !v)} disabled={loading} aria-pressed={asTable}>
          {asTable ? 'Show chart' : 'Show table'}
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : total === 0 && !asTable ? (
        <div className="grid h-64 place-items-center text-sm text-muted">No visitors recorded in this range yet.</div>
      ) : asTable ? (
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-line text-left text-xs text-muted">
                <th scope="col" className="py-2 font-medium">Date</th>
                <th scope="col" className="py-2 text-right font-medium">Users</th>
              </tr>
            </thead>
            <tbody>
              {series.map((d) => (
                <tr key={d.date} className="border-b border-line last:border-0">
                  <td className="py-1.5">{longDate.format(parseDay(d.date))}</td>
                  <td className="num py-1.5 text-right">{formatNumber(d.users)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-64" role="img" aria-label={`Line chart of daily users over the last ${rangeLabel}, ${formatNumber(total)} user-days in total. Use “Show table” for exact values.`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={c['chart-grid']} />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => shortDate.format(parseDay(d))}
                tick={{ fill: c.muted, fontSize: 11, fontFamily: 'JetBrains Mono Variable' }}
                tickLine={false}
                axisLine={{ stroke: c.border }}
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: c.muted, fontSize: 11, fontFamily: 'JetBrains Mono Variable' }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip cursor={{ stroke: c.border, strokeWidth: 1 }} content={<ChartTooltip />} isAnimationActive={false} />
              <Line
                type="monotone"
                dataKey="users"
                stroke={c['chart-1']}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: c['chart-1'], stroke: c.surface, strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-lg shadow-black/10">
      <p className="text-muted">{longDate.format(parseDay(point.date))}</p>
      <p className="mt-0.5 flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-[var(--chart-1)]" aria-hidden="true" />
        <span className="num font-medium text-ink">{formatNumber(point.users)}</span>
        <span className="text-muted">users</span>
      </p>
    </div>
  );
}

function RankTable({ title, subtitle, rows, valueLabel, empty, loading }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="card overflow-hidden" aria-label={title}>
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {loading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon="chart" title="Nothing yet">
          {empty}
        </EmptyState>
      ) : (
        <table className="w-full table-fixed text-sm">
          <thead className="sr-only">
            <tr>
              <th scope="col">Name</th>
              <th scope="col">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-line last:border-0">
                <td className="relative px-4 py-2">
                  {/* thin magnitude bar behind the label */}
                  <span className="absolute inset-y-1 left-2 rounded-sm bg-accent-soft" style={{ width: `calc(${(r.value / max) * 100}% - 0.5rem)` }} aria-hidden="true" />
                  <span className="relative block truncate">{r.label}</span>
                </td>
                <td className="num w-24 px-4 py-2 text-right">{formatNumber(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
