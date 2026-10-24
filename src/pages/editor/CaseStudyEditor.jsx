import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm, useFormState, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router';
import { api, publicCaseStudyUrl } from '../../lib/api.js';
import { keys, useCaseStudy, useInvalidateCaseStudies } from '../../lib/queries.js';
import { formatDateTime } from '../../lib/format.js';
import { MISSING_FIELD_INFO, describeMissing } from '../../lib/fieldLabels.js';
import { useToast } from '../../components/Toast.jsx';
import { Button, EmptyState, StatusBadge } from '../../components/ui.jsx';
import { Skeleton } from '../../components/Skeleton.jsx';
import { Dialog } from '../../components/Dialog.jsx';
import { Icon } from '../../components/Icon.jsx';
import { STEPS, STEP_IDS, emptyValues, errorPaths, formSchema, stepForPath, toFormValues, toPayload } from './model.js';
import { computeReadiness } from './readiness.js';
import { clearLocalDraft, readLocalDraft, writeLocalDraft } from './localDraft.js';
import { StepBasics, StepGlance, StepMarkdown } from './stepsBasics.jsx';
import { StepLessons, StepResearch, StepTimeline, StepWrong } from './stepsMore.jsx';
import { PreviewDialog } from './Preview.jsx';

const AUTOSAVE_MS = 10_000;

export default function CaseStudyEditor() {
  const { id } = useParams();
  const query = useCaseStudy(id);

  if (id && query.isPending) return <EditorSkeleton />;
  if (id && query.isError) {
    return (
      <div className="p-8">
        <EmptyState
          icon="alert"
          title={query.error.status === 404 ? 'Case study not found' : 'Couldn’t load this case study'}
          action={<Link to="/case-studies" className="text-sm font-medium text-accent-text underline">All case studies</Link>}
        >
          {query.error.status === 404 ? 'It may have been deleted.' : query.error.message}
        </EmptyState>
      </div>
    );
  }
  return <EditorForm key={id ?? 'new'} doc={id ? query.data : null} />;
}

function EditorForm({ doc: initialDoc }) {
  const [serverDoc, setServerDoc] = useState(initialDoc);
  const isNew = !serverDoc;
  const draftKey = serverDoc?._id ?? 'new';
  const isPublished = serverDoc?.status === 'published';

  const methods = useForm({
    defaultValues: initialDoc ? toFormValues(initialDoc) : emptyValues(),
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
  });
  const { handleSubmit, reset, getValues, resetField, control } = methods;
  const { isDirty } = useFormState({ control });

  const [params, setParams] = useSearchParams();
  const step = STEP_IDS.includes(params.get('step')) ? params.get('step') : 'basics';
  const goTo = useCallback(
    (next) => {
      const p = new URLSearchParams(params);
      p.set('step', next);
      setParams(p, { replace: true });
      document.getElementById('editor-main')?.scrollTo?.({ top: 0 });
      window.scrollTo({ top: 0 });
    },
    [params, setParams],
  );

  const [autoSlug, setAutoSlug] = useState(isNew);
  const [highlighted, setHighlighted] = useState(() => new Set());
  const [busy, setBusy] = useState(null); // 'save' | 'publish' | 'unpublish'
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [lastLocalAt, setLastLocalAt] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [restorable, setRestorable] = useState(() => {
    const draft = readLocalDraft(draftKey);
    if (!draft) return null;
    const current = JSON.stringify(initialDoc ? toFormValues(initialDoc) : emptyValues());
    return JSON.stringify(draft.values) === current ? null : draft;
  });

  const qc = useQueryClient();
  const invalidateLists = useInvalidateCaseStudies();
  const navigate = useNavigate();
  const toast = useToast();

  // ── unsaved-changes protection ──
  const dirtyRef = useRef(isDirty);
  dirtyRef.current = isDirty;
  const bypassBlockRef = useRef(false);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!dirtyRef.current) return;
      writeLocalDraft(draftKey, getValues(), serverDoc?.updatedAt);
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [draftKey, getValues, serverDoc?.updatedAt]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirtyRef.current && !bypassBlockRef.current && currentLocation.pathname !== nextLocation.pathname,
  );

  // ── local autosave every 10 s while dirty ──
  useEffect(() => {
    const t = setInterval(() => {
      if (!dirtyRef.current) return;
      writeLocalDraft(draftKey, getValues(), serverDoc?.updatedAt);
      setLastLocalAt(new Date());
    }, AUTOSAVE_MS);
    return () => clearInterval(t);
  }, [draftKey, getValues, serverDoc?.updatedAt]);

  // ── save / publish ──
  const persist = useCallback(
    async (values) => {
      const payload = toPayload(values);
      const doc = isNew
        ? await api('/admin/case-studies', { method: 'POST', body: payload })
        : await api(`/admin/case-studies/${serverDoc._id}`, { method: 'PUT', body: payload });
      qc.setQueryData(keys.caseStudy(doc._id), doc);
      invalidateLists();
      clearLocalDraft(draftKey);
      setRestorable(null);
      setLastSavedAt(new Date());
      setLastLocalAt(null);
      setHighlighted(new Set());
      return doc;
    },
    [isNew, serverDoc, qc, invalidateLists, draftKey],
  );

  /** After a save: make the submitted values the new clean baseline (keeps anything typed meanwhile). */
  const settle = useCallback(
    (doc, submitted) => {
      setServerDoc(doc);
      reset(submitted, { keepValues: true });
      if (doc.slug !== submitted.slug) resetField('slug', { defaultValue: doc.slug });
      setAutoSlug(false);
    },
    [reset, resetField],
  );

  const highlightMissing = useCallback(
    (missing) => {
      const steps = new Set(missing.map((f) => MISSING_FIELD_INFO[f]?.step).filter(Boolean));
      setHighlighted(steps);
      const first = STEP_IDS.find((s) => steps.has(s));
      if (first) goTo(first);
    },
    [goTo],
  );

  const handleApiError = useCallback(
    (err, title) => {
      if (err.missing?.length) {
        highlightMissing(err.missing);
        toast.error(title, `Missing: ${describeMissing(err.missing)}.`);
      } else if (err.code === 'VALIDATION_ERROR' && err.details?.length) {
        const first = err.details[0];
        goTo(stepForPath(first.path));
        toast.error(title, `${first.path}: ${first.message}`);
      } else if (err.status !== 401) {
        toast.error(title, err.message);
      }
    },
    [highlightMissing, goTo, toast],
  );

  const onInvalid = useCallback(
    (errors) => {
      const paths = errorPaths(errors);
      const steps = new Set(paths.map(stepForPath));
      const first = STEP_IDS.find((s) => steps.has(s));
      if (first) goTo(first);
      toast.error('Check the highlighted fields', `${paths.length} ${paths.length === 1 ? 'field needs' : 'fields need'} attention before saving.`);
    },
    [goTo, toast],
  );

  const save = handleSubmit(async (values) => {
    setBusy('save');
    try {
      const doc = await persist(values);
      if (isNew) {
        bypassBlockRef.current = true;
        toast.success('Draft created');
        navigate(`/case-studies/${doc._id}/edit?step=${step}`, { replace: true });
        return;
      }
      settle(doc, values);
      toast.success(doc.status === 'published' ? 'Saved and updated on the site' : 'Draft saved');
    } catch (err) {
      handleApiError(err, isPublished ? 'Not saved: a published case study needs every required field' : 'Save failed');
    } finally {
      setBusy(null);
    }
  }, onInvalid);

  const publish = handleSubmit(async (values) => {
    setBusy('publish');
    let doc;
    try {
      doc = await persist(values);
      settle(doc, values);
    } catch (err) {
      setBusy(null);
      return handleApiError(err, 'Save failed');
    }
    try {
      const published = await api(`/admin/case-studies/${doc._id}/publish`, { method: 'POST' });
      qc.setQueryData(keys.caseStudy(published._id), published);
      invalidateLists();
      setServerDoc(published);
      toast.success('Published', 'It’s live on the public site.');
      if (isNew) {
        bypassBlockRef.current = true;
        navigate(`/case-studies/${published._id}/edit?step=${step}`, { replace: true });
      }
    } catch (err) {
      handleApiError(err, 'Can’t publish yet');
      if (isNew) {
        bypassBlockRef.current = true;
        navigate(`/case-studies/${doc._id}/edit?step=${step}`, { replace: true });
      }
    } finally {
      setBusy(null);
    }
  }, onInvalid);

  async function unpublish() {
    setBusy('unpublish');
    try {
      const doc = await api(`/admin/case-studies/${serverDoc._id}/unpublish`, { method: 'POST' });
      qc.setQueryData(keys.caseStudy(doc._id), doc);
      invalidateLists();
      setServerDoc(doc);
      toast.success('Unpublished', 'It’s a draft again and no longer on the public site.');
    } catch (err) {
      handleApiError(err, 'Unpublish failed');
    } finally {
      setBusy(null);
    }
  }

  // Ctrl/Cmd+S saves.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!busy) save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, save]);

  function restoreDraft() {
    const base = emptyValues();
    const v = restorable.values ?? {};
    reset(
      {
        ...base,
        ...v,
        atAGlance: { ...base.atAGlance, ...v.atAGlance },
        sections: { ...base.sections, ...v.sections },
      },
      { keepDefaultValues: true },
    );
    setAutoSlug(false);
    setRestorable(null);
    toast.info('Local draft restored', 'Save to keep these changes.');
  }

  function discardDraft() {
    clearLocalDraft(draftKey);
    setRestorable(null);
  }

  const currentStep = STEPS.find((s) => s.id === step);
  const stepIndex = STEP_IDS.indexOf(step);
  const publicUrl = isPublished ? publicCaseStudyUrl(serverDoc.slug) : null;

  return (
    <FormProvider {...methods}>
      <div className="flex min-h-screen flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-bg/90 px-6 py-3 backdrop-blur">
          <Link to="/case-studies" className="rounded p-1 text-muted hover:text-ink" aria-label="Back to case studies" title="Back to case studies">
            <Icon name="arrow-left" className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <TitleText fallback={isNew ? 'New case study' : serverDoc.name} />
              {!isNew && <StatusBadge status={serverDoc.status} />}
            </div>
            <SaveStatus isNew={isNew} isDirty={isDirty} lastSavedAt={lastSavedAt} lastLocalAt={lastLocalAt} updatedAt={serverDoc?.updatedAt} />
          </div>
          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              title="View on site"
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted hover:bg-surface-2 hover:text-ink"
            >
              <Icon name="external" className="size-4" />
              <span className="sr-only xl:not-sr-only">View on site</span>
            </a>
          )}
          <Button icon="eye" onClick={() => setPreviewOpen(true)} title="Preview">
            <span className="sr-only xl:not-sr-only">Preview</span>
          </Button>
          <Button icon="save" onClick={save} loading={busy === 'save'} disabled={Boolean(busy) && busy !== 'save'} title="Save (Ctrl+S)">
            {isPublished ? 'Save changes' : 'Save draft'}
          </Button>
          {isPublished ? (
            <Button icon="undo" onClick={unpublish} loading={busy === 'unpublish'} disabled={Boolean(busy) && busy !== 'unpublish'}>
              Unpublish
            </Button>
          ) : (
            <PublishButton onClick={publish} loading={busy === 'publish'} disabled={Boolean(busy) && busy !== 'publish'} />
          )}
        </header>

        {restorable && (
          <div role="status" className="flex items-center gap-3 border-b border-line bg-warning-soft px-6 py-2.5 text-sm text-warning">
            <Icon name="info" className="size-4 shrink-0" />
            <p className="flex-1">
              You have unsaved local changes from {formatDateTime(restorable.savedAt)}.
              {serverDoc && restorable.baseUpdatedAt && restorable.baseUpdatedAt !== serverDoc.updatedAt && ' The saved version has changed since then.'}
            </p>
            <Button size="sm" variant="secondary" onClick={restoreDraft}>
              Restore
            </Button>
            <Button size="sm" variant="ghost" onClick={discardDraft}>
              Discard
            </Button>
          </div>
        )}

        <div className="flex flex-1 gap-6 px-6 py-6">
          {/* Step list (+ readiness below xl) */}
          <aside className="sticky top-[73px] h-fit w-52 shrink-0 space-y-6 self-start">
            <StepNav current={step} onSelect={goTo} highlighted={highlighted} />
            <div className="xl:hidden">
              <ReadinessPanel onSelect={goTo} compact />
            </div>
          </aside>

          {/* Current step */}
          <section id="editor-main" aria-label={currentStep.label} className="min-w-0 flex-1">
            {highlighted.size > 0 && highlighted.has(step) && (
              <div role="alert" className="mb-4 flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger">
                <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
                This step has something required for publishing. See the checklist.
              </div>
            )}
            <div className="card p-6">
              {step === 'basics' && <StepBasics autoSlug={autoSlug} onSlugEdited={(edited) => setAutoSlug(isNew && !edited)} isPublished={isPublished} savedSlug={serverDoc?.slug} />}
              {step === 'glance' && <StepGlance />}
              {currentStep.section && <StepMarkdown key={step} step={currentStep} />}
              {step === 'timeline' && <StepTimeline />}
              {step === 'wrong' && <StepWrong />}
              {step === 'lessons' && <StepLessons />}
              {step === 'research' && <StepResearch />}
            </div>
            <div className="mt-4 flex justify-between">
              {stepIndex > 0 ? (
                <Button variant="ghost" icon="chevron-left" onClick={() => goTo(STEP_IDS[stepIndex - 1])}>
                  {STEPS[stepIndex - 1].label}
                </Button>
              ) : (
                <span />
              )}
              {stepIndex < STEPS.length - 1 && (
                <Button variant="ghost" onClick={() => goTo(STEP_IDS[stepIndex + 1])}>
                  {STEPS[stepIndex + 1].label}
                  <Icon name="chevron-right" className="size-4" />
                </Button>
              )}
            </div>
          </section>

          {/* Readiness (xl and up) */}
          <aside className="sticky top-[73px] hidden h-fit w-64 shrink-0 self-start xl:block">
            <ReadinessPanel onSelect={goTo} />
          </aside>
        </div>
      </div>

      <PreviewDialog open={previewOpen} onClose={() => setPreviewOpen(false)} />

      <Dialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Leave without saving?"
        description="Your changes haven’t been saved to the server. A local copy is kept in this browser, and you can restore it when you come back."
        footer={
          <>
            <Button onClick={() => blocker.reset?.()}>Keep editing</Button>
            <Button
              variant="danger"
              onClick={() => {
                writeLocalDraft(draftKey, getValues(), serverDoc?.updatedAt);
                blocker.proceed?.();
              }}
            >
              Leave
            </Button>
          </>
        }
      />
    </FormProvider>
  );
}

function TitleText({ fallback }) {
  const name = useWatch({ name: 'name' });
  return <h1 className="truncate text-base font-semibold">{name?.trim() || fallback}</h1>;
}

function SaveStatus({ isNew, isDirty, lastSavedAt, lastLocalAt, updatedAt }) {
  let text;
  if (isDirty) text = lastLocalAt ? `Unsaved changes · local backup ${formatDateTime(lastLocalAt)}` : 'Unsaved changes';
  else if (lastSavedAt) text = `Saved ${formatDateTime(lastSavedAt)}`;
  else if (isNew) text = 'Not saved yet';
  else text = `Last saved ${formatDateTime(updatedAt)}`;
  return (
    <p className={`text-xs ${isDirty ? 'text-warning' : 'text-muted'}`} aria-live="polite">
      {text}
    </p>
  );
}

function useReadiness() {
  const values = useWatch();
  return useMemo(() => computeReadiness(values), [values]);
}

function PublishButton({ onClick, loading, disabled }) {
  const { ready, required } = useReadiness();
  const remaining = required.filter((r) => !r.ok).length;
  return (
    <Button
      variant="primary"
      icon="send"
      onClick={onClick}
      loading={loading}
      disabled={disabled || !ready}
      title={ready ? 'Save and publish' : `${remaining} required ${remaining === 1 ? 'item' : 'items'} missing`}
    >
      Publish
    </Button>
  );
}

function StepNav({ current, onSelect, highlighted }) {
  const { steps } = useReadiness();
  return (
    <nav aria-label="Case study steps">
      <ol className="space-y-0.5">
        {STEPS.map((s, i) => {
          const status = steps[s.id];
          const active = s.id === current;
          const flagged = highlighted.has(s.id);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                aria-current={active ? 'step' : undefined}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                  active ? 'bg-surface font-medium text-ink shadow-sm ring-1 ring-line' : 'text-muted hover:bg-surface-2 hover:text-ink'
                } ${flagged ? '!ring-1 !ring-danger' : ''}`}
              >
                <StepIcon status={status} flagged={flagged} index={i + 1} />
                <span className="flex-1">{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepIcon({ status, flagged, index }) {
  if (status === 'complete') {
    return (
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent text-on-accent" aria-label="complete">
        <Icon name="check" className="size-3" strokeWidth="3" />
      </span>
    );
  }
  const missing = status === 'missing';
  return (
    <span
      className={`num grid size-5 shrink-0 place-items-center rounded-full border text-[10px] ${
        flagged ? 'border-danger text-danger' : missing ? 'border-warning text-warning' : 'border-line-strong text-faint'
      }`}
      aria-label={missing ? 'required items missing' : 'not complete'}
    >
      {index}
    </span>
  );
}

function ReadinessPanel({ onSelect, compact = false }) {
  const { required, recommended, ready } = useReadiness();
  const done = required.filter((r) => r.ok).length;
  return (
    <div className={`card ${compact ? 'p-3' : 'p-4'}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Publish readiness</h2>
        <span className={`num text-xs ${ready ? 'text-accent-text' : 'text-muted'}`}>
          {done}/{required.length}
        </span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(done / required.length) * 100}%` }} />
      </div>
      {ready && <p className="mb-3 rounded-md bg-accent-soft px-2.5 py-2 text-xs text-accent-text">Everything required is in place. Ready to publish.</p>}
      <p className="mb-1.5 text-xs font-medium tracking-wide text-faint uppercase">Required</p>
      <ChecklistItems items={required} onSelect={onSelect} />
      {!compact && (
        <>
          <p className="mt-4 mb-1.5 text-xs font-medium tracking-wide text-faint uppercase">Recommended</p>
          <ChecklistItems items={recommended} onSelect={onSelect} soft />
        </>
      )}
    </div>
  );
}

function ChecklistItems({ items, onSelect, soft = false }) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.key}>
          <button
            type="button"
            onClick={() => onSelect(item.step)}
            className="flex w-full items-start gap-2 rounded px-1 py-1 text-left text-sm hover:bg-surface-2"
          >
            {item.ok ? (
              <Icon name="check-circle" className="mt-0.5 size-4 shrink-0 text-accent" />
            ) : (
              <Icon name="circle" className={`mt-0.5 size-4 shrink-0 ${soft ? 'text-faint' : 'text-warning'}`} />
            )}
            <span className={item.ok ? 'text-muted line-through decoration-faint' : soft ? 'text-muted' : 'text-ink'}>{item.label}</span>
            <span className="sr-only">{item.ok ? '(done)' : '(missing)'}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function EditorSkeleton() {
  return (
    <div className="p-6" role="status" aria-label="Loading case study">
      <Skeleton className="mb-6 h-8 w-72" />
      <div className="flex gap-6">
        <div className="w-52 space-y-2">
          {Array.from({ length: 11 }, (_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
        <Skeleton className="h-[480px] flex-1" />
        <Skeleton className="hidden h-64 w-64 xl:block" />
      </div>
    </div>
  );
}
