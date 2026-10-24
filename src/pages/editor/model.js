import { z } from 'zod';

/** Editor steps, in reading order. `section` marks a single-Markdown step. */
export const STEPS = [
  { id: 'basics', label: 'Basics' },
  { id: 'glance', label: 'At a Glance' },
  {
    id: 'summary',
    label: 'Executive Summary',
    section: 'executiveSummary',
    helper: 'The whole story in 3-5 sentences. A reader who stops here should understand what happened.',
  },
  {
    id: 'background',
    label: 'Company Background',
    section: 'companyBackground',
    helper: 'What it did, who founded it, how it made money.',
  },
  {
    id: 'market',
    label: 'Market Context',
    section: 'marketContext',
    helper: 'The Bangladesh market at the time, competitors, regulation, funding climate.',
  },
  { id: 'timeline', label: 'Timeline' },
  { id: 'wrong', label: 'What Went Wrong' },
  {
    id: 'differently',
    label: 'What Could Have Been Done',
    section: 'whatCouldHaveBeenDone',
    helper: 'Specific decisions that might have changed the outcome. Be fair: hindsight makes everything look obvious.',
  },
  { id: 'lessons', label: 'Lessons for Founders' },
  {
    id: 'conclusion',
    label: 'Conclusion',
    section: 'conclusion',
    helper: 'Close the story. What is the one idea a founder should take away?',
  },
  { id: 'research', label: 'Research & Sources' },
];

export const STEP_IDS = STEPS.map((s) => s.id);

export const WRONG_HELPER =
  'The long analysis: what actually happened, in what order, and why. Use the failure reasons above as the outline.';
export const RESEARCH_HELPER = 'How was this researched? Interviews, press, public filings? What is uncertain?';

export const LESSONS_MIN = 3;
export const LESSONS_MAX = 6;

const s = (v) => (v == null ? '' : String(v));

export function emptyValues() {
  return toFormValues(null);
}

/** API document → form values (numbers become strings for inputs). */
export function toFormValues(doc) {
  const g = doc?.atAGlance ?? {};
  const sec = doc?.sections ?? {};
  return {
    name: s(doc?.name),
    slug: s(doc?.slug),
    tagline: s(doc?.tagline),
    logoUrl: s(doc?.logoUrl),
    coverImageUrl: s(doc?.coverImageUrl),
    lastVerifiedAt: doc?.lastVerifiedAt ? String(doc.lastVerifiedAt).slice(0, 10) : '',
    atAGlance: {
      sector: s(g.sector),
      city: s(g.city),
      foundedYear: s(g.foundedYear),
      shutDownYear: s(g.shutDownYear),
      founders: (g.founders ?? []).map((f) => ({ name: s(f.name), role: s(f.role) })),
      // Existing documents with no funding amount are treated as "unknown".
      fundingUnknown: doc ? g.fundingAmountUSD == null : false,
      fundingAmountUSD: s(g.fundingAmountUSD),
      fundingRounds: s(g.fundingRounds),
      investors: [...(g.investors ?? [])],
      outcome: s(g.outcome),
      peakTeamSize: s(g.peakTeamSize),
    },
    failureReasons: (doc?.failureReasons ?? []).map((r) => ({ category: s(r.category), summary: s(r.summary) })),
    sections: {
      executiveSummary: s(sec.executiveSummary),
      companyBackground: s(sec.companyBackground),
      marketContext: s(sec.marketContext),
      whatWentWrong: s(sec.whatWentWrong),
      whatCouldHaveBeenDone: s(sec.whatCouldHaveBeenDone),
      conclusion: s(sec.conclusion),
      researchNotes: s(sec.researchNotes),
    },
    timeline: (doc?.timeline ?? []).map((t) => ({ year: s(t.year), month: s(t.month), event: s(t.event) })),
    lessons: (doc?.lessons ?? []).map((value) => ({ value: s(value) })),
    competitors: (doc?.competitors ?? []).map((c) => ({ name: s(c.name), url: s(c.url) })),
    sources: (doc?.sources ?? []).map((src) => ({
      title: s(src.title),
      url: s(src.url),
      publisher: s(src.publisher),
      date: s(src.date),
    })),
  };
}

const int = (v) => (v === '' || v == null ? null : Number(v));
const trim = (v) => (v ?? '').trim();
const isEmptyRow = (row) => Object.values(row).every((v) => trim(String(v ?? '')) === '');

/** Form values → API payload. Fully empty repeatable rows are dropped. */
export function toPayload(v) {
  const g = v.atAGlance;
  return {
    name: trim(v.name),
    slug: trim(v.slug),
    tagline: trim(v.tagline),
    logoUrl: trim(v.logoUrl),
    coverImageUrl: trim(v.coverImageUrl),
    lastVerifiedAt: v.lastVerifiedAt || null,
    atAGlance: {
      sector: g.sector || null,
      city: g.city || null,
      foundedYear: int(g.foundedYear),
      shutDownYear: int(g.shutDownYear),
      founders: g.founders.filter((f) => !isEmptyRow(f)).map((f) => ({ name: trim(f.name), role: trim(f.role) })),
      fundingAmountUSD: g.fundingUnknown ? null : int(g.fundingAmountUSD),
      fundingRounds: int(g.fundingRounds),
      investors: g.investors.map(trim).filter(Boolean),
      outcome: g.outcome || null,
      peakTeamSize: int(g.peakTeamSize),
    },
    failureReasons: v.failureReasons
      .filter((r) => !isEmptyRow(r))
      .map((r) => ({ category: r.category, summary: trim(r.summary) })),
    sections: Object.fromEntries(Object.entries(v.sections).map(([k, val]) => [k, val ?? ''])),
    timeline: v.timeline
      .filter((t) => !isEmptyRow(t))
      .map((t) => ({ year: int(t.year), month: int(t.month), event: trim(t.event) })),
    lessons: v.lessons.map((l) => trim(l.value)).filter(Boolean),
    competitors: v.competitors.filter((c) => !isEmptyRow(c)).map((c) => ({ name: trim(c.name), url: trim(c.url) })),
    sources: v.sources
      .filter((src) => !isEmptyRow(src))
      .map((src) => ({ title: trim(src.title), url: trim(src.url), publisher: trim(src.publisher), date: trim(src.date) })),
  };
}

// ── Validation (format only; completeness for publishing is handled by readiness) ──

const isHttpUrl = (v) => {
  try {
    return ['http:', 'https:'].includes(new URL(v).protocol);
  } catch {
    return false;
  }
};
const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === '' || isHttpUrl(v), 'Enter a full URL starting with http:// or https://');
const optionalInt = (min, max, label) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) >= min && Number(v) <= max), `${label} must be a whole number between ${min} and ${max}`);
const year = (label) => optionalInt(1900, 2100, label);

/** Require `fields` only when the row has any content (empty rows are dropped on save). */
const row = (shape, required) =>
  z.object(shape).superRefine((val, ctx) => {
    if (isEmptyRow(val)) return;
    for (const [key, message] of Object.entries(required)) {
      if (trim(String(val[key] ?? '')) === '') ctx.addIssue({ code: 'custom', path: [key], message });
    }
  });

export const formSchema = z
  .object({
    name: z.string().trim().min(1, 'Give the case study a name').max(200),
    slug: z
      .string()
      .trim()
      .max(100)
      .refine((v) => v === '' || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v), 'Use lowercase letters, numbers and single hyphens'),
    tagline: z.string().trim().max(300, 'Keep the tagline to one sentence (300 characters max)'),
    logoUrl: optionalUrl,
    coverImageUrl: optionalUrl,
    lastVerifiedAt: z.string(),
    atAGlance: z.object({
      sector: z.string(),
      city: z.string(),
      foundedYear: year('Founded year'),
      shutDownYear: year('Shut-down year'),
      founders: z.array(row({ name: z.string().max(120), role: z.string().max(120) }, { name: 'Add the founder’s name or remove the row' })),
      fundingUnknown: z.boolean(),
      fundingAmountUSD: optionalInt(0, 1e12, 'Funding'),
      fundingRounds: optionalInt(0, 100, 'Funding rounds'),
      investors: z.array(z.string()),
      outcome: z.string(),
      peakTeamSize: optionalInt(0, 1_000_000, 'Team size'),
    }),
    failureReasons: z.array(row({ category: z.string(), summary: z.string().max(1000) }, { category: 'Pick a category' })),
    sections: z.object({
      executiveSummary: z.string(),
      companyBackground: z.string(),
      marketContext: z.string(),
      whatWentWrong: z.string(),
      whatCouldHaveBeenDone: z.string(),
      conclusion: z.string(),
      researchNotes: z.string(),
    }),
    timeline: z.array(
      row(
        { year: year('Year'), month: z.string(), event: z.string().max(500) },
        { year: 'Add a year', event: 'Describe what happened' },
      ),
    ),
    lessons: z.array(z.object({ value: z.string().max(300, 'Keep lessons short (300 characters max)') })).max(LESSONS_MAX + 4),
    competitors: z.array(row({ name: z.string().max(120), url: optionalUrl }, { name: 'Add a name or remove the row' })),
    sources: z.array(
      row(
        { title: z.string().max(300), url: optionalUrl, publisher: z.string().max(200), date: z.string().max(40) },
        { title: 'Add a title', url: 'Add the link' },
      ),
    ),
  })
  .superRefine((v, ctx) => {
    const { foundedYear, shutDownYear } = v.atAGlance;
    if (foundedYear && shutDownYear && Number(shutDownYear) < Number(foundedYear)) {
      ctx.addIssue({ code: 'custom', path: ['atAGlance', 'shutDownYear'], message: 'Shut-down year can’t be before the founded year' });
    }
  });

/** Which step a form field (dot path) lives on. */
export function stepForPath(path) {
  const [root, sub] = path.split('.');
  if (['name', 'slug', 'tagline', 'logoUrl', 'coverImageUrl'].includes(root)) return 'basics';
  if (root === 'atAGlance') return 'glance';
  if (root === 'timeline') return 'timeline';
  if (root === 'failureReasons') return 'wrong';
  if (root === 'lessons') return 'lessons';
  if (['competitors', 'sources', 'lastVerifiedAt'].includes(root)) return 'research';
  if (root === 'sections') {
    if (sub === 'whatWentWrong') return 'wrong';
    if (sub === 'researchNotes') return 'research';
    return STEPS.find((st) => st.section === sub)?.id ?? 'basics';
  }
  return 'basics';
}

/** Flatten RHF errors into dot paths. */
export function errorPaths(errors, prefix = '') {
  const out = [];
  for (const [key, val] of Object.entries(errors ?? {})) {
    if (!val || key === 'ref') continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (val.message && typeof val.message === 'string') out.push(path);
    else if (typeof val === 'object') out.push(...errorPaths(val, path));
  }
  return out;
}
