import { useFormContext } from 'react-hook-form';
import MDEditor from '@uiw/react-md-editor/nohighlight';
import { Dialog } from '../../components/Dialog.jsx';
import { countWords, formatDate, formatUsdCompact } from '../../lib/format.js';
import { MONTHS } from '../../lib/taxonomies.js';
import { sanitizePlugins } from './fields.jsx';
import { toPayload } from './model.js';

const SECTIONS = [
  ['executiveSummary', 'Executive summary'],
  ['companyBackground', 'Company background'],
  ['marketContext', 'Market context'],
];
const LATE_SECTIONS = [
  ['whatCouldHaveBeenDone', 'What could have been done differently'],
  ['conclusion', 'Conclusion'],
];

/** Renders the current (unsaved) form roughly as readers will see it. */
export function PreviewDialog({ open, onClose }) {
  const { getValues } = useFormContext();
  return (
    <Dialog open={open} onClose={onClose} title="Preview" description="How readers will roughly see it. Unsaved changes included." size="xl">
      {open && <Article cs={toPayload(getValues())} />}
    </Dialog>
  );
}

function Md({ children }) {
  if (!children?.trim()) return null;
  return <MDEditor.Markdown source={children} rehypePlugins={sanitizePlugins} className="prose-md" />;
}

function Article({ cs }) {
  const g = cs.atAGlance;
  const words = Object.values(cs.sections).reduce((n, s) => n + countWords(s), 0);
  const lifespan = g.foundedYear && g.shutDownYear && g.shutDownYear >= g.foundedYear ? g.shutDownYear - g.foundedYear : null;
  const facts = [
    ['Sector', g.sector],
    ['City', g.city],
    ['Founded', g.foundedYear],
    ['Shut down', g.shutDownYear],
    ['Lifespan', lifespan == null ? null : `${lifespan} ${lifespan === 1 ? 'year' : 'years'}`],
    ['Funding', g.fundingAmountUSD == null ? 'Unknown' : formatUsdCompact(g.fundingAmountUSD)],
    ['Rounds', g.fundingRounds],
    ['Outcome', g.outcome],
    ['Peak team', g.peakTeamSize],
  ].filter(([, v]) => v != null && v !== '');

  return (
    <article className="mx-auto max-w-2xl pb-6">
      {cs.coverImageUrl && <img src={cs.coverImageUrl} alt="" className="mb-6 aspect-[16/9] w-full rounded-lg object-cover" />}
      <header className="mb-6 flex items-start gap-4">
        {cs.logoUrl && <img src={cs.logoUrl} alt="" className="size-14 shrink-0 rounded-lg border border-line bg-white object-contain p-1" />}
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{cs.name || 'Untitled'}</h1>
          {cs.tagline && <p className="mt-1.5 text-lg text-muted">{cs.tagline}</p>}
          <p className="num mt-2 text-xs text-faint">{Math.max(words ? 1 : 0, Math.ceil(words / 220))} min read</p>
        </div>
      </header>

      {facts.length > 0 && (
        <dl className="mb-8 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
          {facts.map(([k, v]) => (
            <div key={k} className="bg-surface-2 px-3 py-2.5">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="num mt-0.5 text-sm">{v}</dd>
            </div>
          ))}
          {g.founders.length > 0 && (
            <div className="col-span-3 bg-surface-2 px-3 py-2.5">
              <dt className="text-xs text-muted">Founders</dt>
              <dd className="mt-0.5 text-sm">{g.founders.map((f) => (f.role ? `${f.name} (${f.role})` : f.name)).join(', ')}</dd>
            </div>
          )}
          {g.investors.length > 0 && (
            <div className="col-span-3 bg-surface-2 px-3 py-2.5">
              <dt className="text-xs text-muted">Investors</dt>
              <dd className="mt-0.5 text-sm">{g.investors.join(', ')}</dd>
            </div>
          )}
        </dl>
      )}

      {SECTIONS.map(([key, title]) => (
        <Section key={key} title={title} show={cs.sections[key]?.trim()}>
          <Md>{cs.sections[key]}</Md>
        </Section>
      ))}

      <Section title="Timeline" show={cs.timeline.length}>
        <ol className="space-y-2 border-l-2 border-line pl-4">
          {cs.timeline.map((t, i) => (
            <li key={i} className="text-sm">
              <span className="num mr-2 text-muted">
                {t.month ? `${MONTHS[t.month - 1]} ` : ''}
                {t.year}
              </span>
              {t.event}
            </li>
          ))}
        </ol>
      </Section>

      <Section title="What went wrong" show={cs.failureReasons.length || cs.sections.whatWentWrong?.trim()}>
        {cs.failureReasons.length > 0 && (
          <ul className="mb-4 space-y-2">
            {cs.failureReasons.map((r, i) => (
              <li key={i} className="rounded-md border border-line px-3 py-2">
                <p className="text-sm font-medium">{r.category}</p>
                {r.summary && <p className="mt-0.5 text-sm text-muted">{r.summary}</p>}
              </li>
            ))}
          </ul>
        )}
        <Md>{cs.sections.whatWentWrong}</Md>
      </Section>

      {LATE_SECTIONS.slice(0, 1).map(([key, title]) => (
        <Section key={key} title={title} show={cs.sections[key]?.trim()}>
          <Md>{cs.sections[key]}</Md>
        </Section>
      ))}

      <Section title="Lessons for founders" show={cs.lessons.length}>
        <ol className="list-decimal space-y-1.5 pl-5">
          {cs.lessons.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ol>
      </Section>

      {LATE_SECTIONS.slice(1).map(([key, title]) => (
        <Section key={key} title={title} show={cs.sections[key]?.trim()}>
          <Md>{cs.sections[key]}</Md>
        </Section>
      ))}

      <Section title="Research notes" show={cs.sections.researchNotes?.trim()}>
        <Md>{cs.sections.researchNotes}</Md>
      </Section>

      <Section title="Competitors" show={cs.competitors.length}>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {cs.competitors.map((c, i) => (
            <li key={i}>
              {c.url ? (
                <a href={c.url} target="_blank" rel="noreferrer" className="text-accent-text underline">
                  {c.name}
                </a>
              ) : (
                c.name
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Sources" show={cs.sources.length}>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm">
          {cs.sources.map((src, i) => (
            <li key={i}>
              <a href={src.url} target="_blank" rel="noreferrer" className="text-accent-text underline">
                {src.title}
              </a>
              {[src.publisher, src.date].filter(Boolean).length > 0 && <span className="text-muted"> · {[src.publisher, src.date].filter(Boolean).join(', ')}</span>}
            </li>
          ))}
        </ol>
        {cs.lastVerifiedAt && <p className="mt-3 text-xs text-faint">Last verified {formatDate(cs.lastVerifiedAt)}</p>}
      </Section>
    </article>
  );
}

function Section({ title, show, children }) {
  if (!show) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 border-b border-line pb-2 text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
