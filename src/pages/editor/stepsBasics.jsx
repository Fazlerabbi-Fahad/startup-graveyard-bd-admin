import { useEffect } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { slugify } from '../../lib/format.js';
import { useTaxonomies } from '../../lib/queries.js';
import { Button } from '../../components/ui.jsx';
import { Field, ImageUploadField, MarkdownField, RemoveRowButton, SelectField, StepHeader, TagInputField, TextField } from './fields.jsx';

// ── a) Basics ────────────────────────────────────────────────
export function StepBasics({ autoSlug, onSlugEdited, isPublished, savedSlug }) {
  const { control, setValue, register } = useFormContext();
  const name = useWatch({ control, name: 'name' });
  const slug = useWatch({ control, name: 'slug' });

  useEffect(() => {
    if (autoSlug) setValue('slug', slugify(name), { shouldDirty: true });
  }, [name, autoSlug, setValue]);

  const slugField = register('slug');

  return (
    <div className="space-y-6">
      <StepHeader title="Basics" helper="Who this case study is about, in one line." />
      <TextField name="name" label="Startup name" autoComplete="off" />

      <Field
        name="slug"
        label="Slug"
        hint={
          isPublished && savedSlug && slug !== savedSlug
            ? 'Changing the slug of a published case study breaks existing links to it.'
            : autoSlug
              ? 'Generated from the name. Edit it to set your own.'
              : 'Used in the public URL. Lowercase letters, numbers and hyphens.'
        }
      >
        {(a11y) => (
          <div className="flex items-stretch">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-line bg-surface-2 px-3 font-mono text-xs text-muted">/case-studies/</span>
            <input
              className="input rounded-l-none font-mono"
              autoComplete="off"
              spellCheck={false}
              {...a11y}
              {...slugField}
              onChange={(e) => {
                onSlugEdited(e.target.value.trim() !== '');
                slugField.onChange(e);
              }}
            />
          </div>
        )}
      </Field>

      <TextField name="tagline" label="Tagline" hint="One sentence: what it did. Shown under the name and in listings." autoComplete="off" />

      <div className="grid gap-6 border-t border-line pt-6">
        <ImageUploadField name="logoUrl" label="Logo" aspect="aspect-square" fit="object-contain p-3" hint="Square works best. JPG, PNG or WebP up to 5 MB." />
        <ImageUploadField name="coverImageUrl" label="Cover image" hint="Wide image shown at the top of the article. 1600×900 or larger." />
      </div>
    </div>
  );
}

// ── b) At a Glance ───────────────────────────────────────────
export function StepGlance() {
  const { control, register, setValue } = useFormContext();
  const { data: tax } = useTaxonomies();
  const founders = useFieldArray({ control, name: 'atAGlance.founders' });
  const [founded, shutDown, fundingUnknown] = useWatch({
    control,
    name: ['atAGlance.foundedYear', 'atAGlance.shutDownYear', 'atAGlance.fundingUnknown'],
  });
  const lifespan = /^\d{4}$/.test(founded) && /^\d{4}$/.test(shutDown) && Number(shutDown) >= Number(founded) ? Number(shutDown) - Number(founded) : null;

  return (
    <div className="space-y-6">
      <StepHeader title="At a Glance" helper="The facts box readers scan before the story." />

      <div className="grid grid-cols-2 gap-4">
        <SelectField name="atAGlance.sector" label="Sector" options={tax.sectors} />
        <SelectField name="atAGlance.city" label="City" options={tax.cities} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <TextField name="atAGlance.foundedYear" label="Founded" inputMode="numeric" maxLength={4} className="[&_input]:font-mono" />
        <TextField name="atAGlance.shutDownYear" label="Shut down" inputMode="numeric" maxLength={4} className="[&_input]:font-mono" />
        <div>
          <p className="label">Lifespan</p>
          <p className="num flex h-[38px] items-center rounded-md bg-surface-2 px-3 text-sm text-muted" aria-live="polite">
            {lifespan == null ? '—' : `${lifespan} ${lifespan === 1 ? 'year' : 'years'}`}
          </p>
        </div>
      </div>

      <SelectField name="atAGlance.outcome" label="Outcome" options={tax.outcomes} />

      <fieldset>
        <legend className="label">Founders</legend>
        {founders.fields.length > 0 && (
          <ul className="mb-2 space-y-2">
            {founders.fields.map((f, i) => (
              <li key={f.id} className="flex items-start gap-2">
                <TextField name={`atAGlance.founders.${i}.name`} aria-label={`Founder ${i + 1} name`} placeholder="Name" className="flex-1" autoComplete="off" />
                <TextField name={`atAGlance.founders.${i}.role`} aria-label={`Founder ${i + 1} role`} placeholder="Role" className="flex-1" autoComplete="off" />
                <RemoveRowButton onClick={() => founders.remove(i)} label={`Remove founder ${i + 1}`} />
              </li>
            ))}
          </ul>
        )}
        <Button size="sm" icon="plus" onClick={() => founders.append({ name: '', role: '' }, { focusName: `atAGlance.founders.${founders.fields.length}.name` })}>
          Add founder
        </Button>
      </fieldset>

      <div className="grid grid-cols-2 gap-4 border-t border-line pt-6">
        <Field name="atAGlance.fundingAmountUSD" label="Total funding (USD)">
          {(a11y) => (
            <div>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-sm text-faint">$</span>
                <input
                  className="input pl-7 font-mono disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-faint"
                  inputMode="numeric"
                  disabled={fundingUnknown}
                  {...a11y}
                  {...register('atAGlance.fundingAmountUSD')}
                />
              </div>
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-muted select-none">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--accent)]"
                  {...register('atAGlance.fundingUnknown', {
                    onChange: (e) => e.target.checked && setValue('atAGlance.fundingAmountUSD', '', { shouldValidate: true }),
                  })}
                />
                Unknown
              </label>
            </div>
          )}
        </Field>
        <TextField name="atAGlance.fundingRounds" label="Funding rounds" inputMode="numeric" optional className="[&_input]:font-mono" />
      </div>

      <TagInputField name="atAGlance.investors" label="Investors" hint="Press Enter or comma after each investor." />
      <TextField name="atAGlance.peakTeamSize" label="Peak team size" inputMode="numeric" optional className="max-w-[12rem] [&_input]:font-mono" />
    </div>
  );
}

// ── c, d, e, h, j) single Markdown section steps ─────────────
export function StepMarkdown({ step }) {
  return (
    <div>
      <StepHeader title={step.label} helper={step.helper} />
      <MarkdownField name={`sections.${step.section}`} label={step.label} helper={step.helper} showHeader={false} height={520} />
    </div>
  );
}
