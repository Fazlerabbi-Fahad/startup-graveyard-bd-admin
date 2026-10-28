import { LESSONS_MAX, LESSONS_MIN, STEPS } from './model.js';

const filled = (v) => typeof v === 'string' && v.trim() !== '';
const httpUrl = (v) => {
  try {
    return ['http:', 'https:'].includes(new URL(v.trim()).protocol);
  } catch {
    return false;
  }
};

/**
 * Mirrors the API's publish rules (required) and adds editorial nudges (recommended).
 * Returns per-step status for the step list checkmarks.
 */
export function computeReadiness(v) {
  const g = v.atAGlance ?? {};
  const lessons = (v.lessons ?? []).filter((l) => filled(l.value));
  const reasons = (v.failureReasons ?? []).filter((r) => filled(r.category));
  const sources = (v.sources ?? []).filter((src) => filled(src.title) && filled(src.url) && httpUrl(src.url));
  const timeline = (v.timeline ?? []).filter((t) => filled(t.year) && filled(t.event));
  const sec = v.sections ?? {};

  const required = [
    { key: 'tagline', label: 'Tagline', step: 'basics', ok: filled(v.tagline) },
    { key: 'sections.executiveSummary', label: 'Executive summary', step: 'summary', ok: filled(sec.executiveSummary) },
    { key: 'sections.whatWentWrong', label: 'What went wrong analysis', step: 'wrong', ok: filled(sec.whatWentWrong) },
    { key: 'failureReasons', label: 'At least one failure reason', step: 'wrong', ok: reasons.length > 0 },
    { key: 'sources', label: 'At least one source', step: 'research', ok: sources.length > 0 },
  ];

  const recommended = [
    { key: 'glance', label: 'Sector, city and outcome', step: 'glance', ok: filled(g.sector) && filled(g.city) && filled(g.outcome) },
    { key: 'years', label: 'Founded and shut-down years', step: 'glance', ok: filled(g.foundedYear) && filled(g.shutDownYear) },
    { key: 'background', label: 'Company background', step: 'background', ok: filled(sec.companyBackground) },
    { key: 'market', label: 'Market context', step: 'market', ok: filled(sec.marketContext) },
    { key: 'timeline', label: 'Timeline (3+ events)', step: 'timeline', ok: timeline.length >= 3 },
    { key: 'differently', label: 'What could have been done', step: 'differently', ok: filled(sec.whatCouldHaveBeenDone) },
    {
      key: 'lessonCount',
      label: `${LESSONS_MIN}–${LESSONS_MAX} lessons`,
      step: 'lessons',
      ok: lessons.length >= LESSONS_MIN && lessons.length <= LESSONS_MAX,
    },
    { key: 'conclusion', label: 'Conclusion', step: 'conclusion', ok: filled(sec.conclusion) },
    { key: 'researchNotes', label: 'Research notes', step: 'research', ok: filled(sec.researchNotes) },
  ];

  // A step is "complete" when everything required or recommended on it is done,
  // "missing" when a publish requirement on it is unmet, otherwise "todo".
  const steps = {};
  for (const step of STEPS) {
    const req = required.filter((r) => r.step === step.id);
    const rec = recommended.filter((r) => r.step === step.id);
    const all = [...req, ...rec];
    const sectionDone = step.section ? filled(sec[step.section]) : true;
    let status = 'todo';
    if (req.some((r) => !r.ok)) status = 'missing';
    else if (all.length ? all.every((r) => r.ok) && sectionDone : sectionDone && filled(v.name)) status = 'complete';
    steps[step.id] = status;
  }

  return { required, recommended, ready: required.every((r) => r.ok), steps };
}
