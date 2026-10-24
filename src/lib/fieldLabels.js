// Human labels + editor step for the fields the API can report as missing on publish.
export const MISSING_FIELD_INFO = {
  tagline: { label: 'Tagline', step: 'basics' },
  'sections.executiveSummary': { label: 'Executive summary', step: 'summary' },
  'sections.whatWentWrong': { label: 'What went wrong analysis', step: 'wrong' },
  failureReasons: { label: 'At least one failure reason', step: 'wrong' },
  lessons: { label: 'At least one lesson', step: 'lessons' },
  sources: { label: 'At least one source', step: 'research' },
};

export const describeMissing = (missing = []) => missing.map((f) => MISSING_FIELD_INFO[f]?.label ?? f).join(', ');
