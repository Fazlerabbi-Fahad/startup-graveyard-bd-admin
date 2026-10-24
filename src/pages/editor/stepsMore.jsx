import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useTaxonomies } from '../../lib/queries.js';
import { MONTHS } from '../../lib/taxonomies.js';
import { Button } from '../../components/ui.jsx';
import { Field, MarkdownField, RemoveRowButton, SelectField, SortableList, SortableRow, StepHeader, TextField } from './fields.jsx';
import { LESSONS_MAX, LESSONS_MIN, RESEARCH_HELPER, WRONG_HELPER } from './model.js';

// ── f) Timeline ──────────────────────────────────────────────
export function StepTimeline() {
  const { control, getValues } = useFormContext();
  const { fields, append, remove, move, replace } = useFieldArray({ control, name: 'timeline' });

  function autoSort() {
    const rows = getValues('timeline');
    const sorted = [...rows].sort((a, b) => {
      const ya = Number(a.year) || Infinity;
      const yb = Number(b.year) || Infinity;
      return ya - yb || (Number(a.month) || 0) - (Number(b.month) || 0);
    });
    replace(sorted);
  }

  return (
    <div>
      <StepHeader title="Timeline" helper="Key moments from founding to shutdown. Drag rows to reorder, or sort by date.">
        {fields.length > 1 && (
          <Button size="sm" icon="sort" onClick={autoSort}>
            Sort by date
          </Button>
        )}
      </StepHeader>

      {fields.length > 0 && (
        <SortableList items={fields} onMove={move}>
          <ol className="mb-3 space-y-2">
            {fields.map((f, i) => (
              <SortableRow key={f.id} id={f.id} label={`event ${i + 1}`}>
                <div className="flex items-start gap-2">
                  <TextField name={`timeline.${i}.year`} aria-label={`Event ${i + 1} year`} placeholder="Year" inputMode="numeric" maxLength={4} className="w-24 [&_input]:font-mono" />
                  <MonthSelect name={`timeline.${i}.month`} label={`Event ${i + 1} month`} />
                  <TextField name={`timeline.${i}.event`} aria-label={`Event ${i + 1} description`} placeholder="What happened" className="flex-1" autoComplete="off" />
                  <RemoveRowButton onClick={() => remove(i)} label={`Remove event ${i + 1}`} />
                </div>
              </SortableRow>
            ))}
          </ol>
        </SortableList>
      )}
      {fields.length === 0 && <p className="mb-3 text-sm text-muted">No events yet. Start with the founding date.</p>}

      <Button size="sm" icon="plus" onClick={() => append({ year: '', month: '', event: '' }, { focusName: `timeline.${fields.length}.year` })}>
        Add event
      </Button>
    </div>
  );
}

function MonthSelect({ name, label }) {
  const { register } = useFormContext();
  return (
    <select className="input w-24" aria-label={label} {...register(name)}>
      <option value="">Month</option>
      {MONTHS.map((m, i) => (
        <option key={m} value={String(i + 1)}>
          {m}
        </option>
      ))}
    </select>
  );
}

// ── g) What Went Wrong ───────────────────────────────────────
export function StepWrong() {
  const { control, register } = useFormContext();
  const { data: tax } = useTaxonomies();
  const { fields, append, remove } = useFieldArray({ control, name: 'failureReasons' });

  return (
    <div className="space-y-8">
      <StepHeader title="What Went Wrong" helper="Name the causes first, then tell the story in depth." />

      <fieldset>
        <legend className="label">Failure reasons</legend>
        <p className="hint -mt-1 mb-3">Pick a category for each cause and summarise it in one paragraph.</p>
        {fields.length > 0 && (
          <ol className="mb-3 space-y-3">
            {fields.map((f, i) => (
              <li key={f.id} className="flex items-start gap-2 rounded-md border border-line p-3">
                <span className="num mt-2 w-5 shrink-0 text-xs text-faint">{i + 1}.</span>
                <div className="min-w-0 flex-1 space-y-2">
                  <SelectField name={`failureReasons.${i}.category`} options={tax.failureCategories} placeholder="Choose a category…" className="max-w-sm" />
                  <Field name={`failureReasons.${i}.summary`}>
                    {(a11y) => <textarea rows={3} className="input resize-y" aria-label={`Reason ${i + 1} summary`} {...a11y} {...register(`failureReasons.${i}.summary`)} />}
                  </Field>
                </div>
                <RemoveRowButton onClick={() => remove(i)} label={`Remove reason ${i + 1}`} />
              </li>
            ))}
          </ol>
        )}
        <Button size="sm" icon="plus" onClick={() => append({ category: '', summary: '' })}>
          Add failure reason
        </Button>
      </fieldset>

      <div className="border-t border-line pt-6">
        <MarkdownField name="sections.whatWentWrong" label="Analysis" helper={WRONG_HELPER} height={520} />
      </div>
    </div>
  );
}

// ── i) Lessons ───────────────────────────────────────────────
export function StepLessons() {
  const { control } = useFormContext();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'lessons' });
  const values = useWatch({ control, name: 'lessons' }) ?? [];
  const count = values.filter((l) => l.value?.trim()).length;
  const inRange = count >= LESSONS_MIN && count <= LESSONS_MAX;

  return (
    <div>
      <StepHeader title="Lessons for Founders" helper={`${LESSONS_MIN}-${LESSONS_MAX} short takeaways, one line each. Write them as advice a founder can act on.`}>
        <span className={`num shrink-0 rounded-full px-2 py-0.5 text-xs ${inRange ? 'bg-accent-soft text-accent-text' : 'bg-surface-2 text-muted'}`}>
          {count} / {LESSONS_MIN}–{LESSONS_MAX}
        </span>
      </StepHeader>

      {fields.length > 0 && (
        <SortableList items={fields} onMove={move}>
          <ol className="mb-3 space-y-2">
            {fields.map((f, i) => (
              <SortableRow key={f.id} id={f.id} label={`lesson ${i + 1}`}>
                <div className="flex items-start gap-2">
                  <span className="num mt-2 w-5 shrink-0 text-xs text-faint">{i + 1}.</span>
                  <TextField name={`lessons.${i}.value`} aria-label={`Lesson ${i + 1}`} className="flex-1" autoComplete="off" maxLength={300} />
                  <RemoveRowButton onClick={() => remove(i)} label={`Remove lesson ${i + 1}`} />
                </div>
              </SortableRow>
            ))}
          </ol>
        </SortableList>
      )}
      {fields.length === 0 && <p className="mb-3 text-sm text-muted">No lessons yet.</p>}

      <Button
        size="sm"
        icon="plus"
        disabled={fields.length >= LESSONS_MAX}
        onClick={() => append({ value: '' }, { focusName: `lessons.${fields.length}.value` })}
      >
        Add lesson
      </Button>
      {fields.length >= LESSONS_MAX && <p className="hint">Six is the limit. Keep the strongest ones.</p>}
    </div>
  );
}

// ── k) Research Notes & Sources ──────────────────────────────
export function StepResearch() {
  const { control } = useFormContext();
  const sources = useFieldArray({ control, name: 'sources' });
  const competitors = useFieldArray({ control, name: 'competitors' });

  return (
    <div className="space-y-8">
      <StepHeader title="Research Notes & Sources" helper="Show your work. Every case study needs at least one source to publish." />

      <MarkdownField name="sections.researchNotes" label="Research notes" helper={RESEARCH_HELPER} height={320} />

      <fieldset className="border-t border-line pt-6">
        <legend className="label">Sources</legend>
        {sources.fields.length > 0 && (
          <ol className="mb-3 space-y-3">
            {sources.fields.map((f, i) => (
              <li key={f.id} className="flex items-start gap-2 rounded-md border border-line p-3">
                <span className="num mt-2 w-5 shrink-0 text-xs text-faint">{i + 1}.</span>
                <div className="grid min-w-0 flex-1 grid-cols-6 gap-2">
                  <TextField name={`sources.${i}.title`} aria-label={`Source ${i + 1} title`} placeholder="Title" className="col-span-6" autoComplete="off" />
                  <TextField name={`sources.${i}.url`} aria-label={`Source ${i + 1} URL`} placeholder="https://" type="url" className="col-span-6 [&_input]:font-mono [&_input]:text-[13px]" />
                  <TextField name={`sources.${i}.publisher`} aria-label={`Source ${i + 1} publisher`} placeholder="Publisher" className="col-span-4" autoComplete="off" />
                  <TextField name={`sources.${i}.date`} aria-label={`Source ${i + 1} date`} placeholder="YYYY-MM-DD" className="col-span-2 [&_input]:font-mono" autoComplete="off" />
                </div>
                <RemoveRowButton onClick={() => sources.remove(i)} label={`Remove source ${i + 1}`} />
              </li>
            ))}
          </ol>
        )}
        <Button size="sm" icon="plus" onClick={() => sources.append({ title: '', url: '', publisher: '', date: '' }, { focusName: `sources.${sources.fields.length}.title` })}>
          Add source
        </Button>
      </fieldset>

      <fieldset className="border-t border-line pt-6">
        <legend className="label">Competitors</legend>
        {competitors.fields.length > 0 && (
          <ul className="mb-3 space-y-2">
            {competitors.fields.map((f, i) => (
              <li key={f.id} className="flex items-start gap-2">
                <TextField name={`competitors.${i}.name`} aria-label={`Competitor ${i + 1} name`} placeholder="Name" className="w-56" autoComplete="off" />
                <TextField name={`competitors.${i}.url`} aria-label={`Competitor ${i + 1} URL`} placeholder="https:// (optional)" type="url" className="flex-1 [&_input]:font-mono [&_input]:text-[13px]" />
                <RemoveRowButton onClick={() => competitors.remove(i)} label={`Remove competitor ${i + 1}`} />
              </li>
            ))}
          </ul>
        )}
        <Button size="sm" icon="plus" onClick={() => competitors.append({ name: '', url: '' }, { focusName: `competitors.${competitors.fields.length}.name` })}>
          Add competitor
        </Button>
      </fieldset>

      <div className="border-t border-line pt-6">
        <TextField name="lastVerifiedAt" label="Last verified" type="date" hint="When you last checked the facts against the sources." className="max-w-[14rem] [&_input]:font-mono" />
      </div>
    </div>
  );
}
