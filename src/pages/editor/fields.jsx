import { useId, useRef, useState } from 'react';
import { Controller, get, useFormContext, useWatch } from 'react-hook-form';
import MDEditor from '@uiw/react-md-editor/nohighlight';
import rehypeSanitize from 'rehype-sanitize';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVertical } from './dndModifiers.js';
import { api } from '../../lib/api.js';
import { countWords } from '../../lib/format.js';
import { useToast } from '../../components/Toast.jsx';
import { Button, Spinner } from '../../components/ui.jsx';
import { Icon } from '../../components/Icon.jsx';

export const sanitizePlugins = [[rehypeSanitize]];

export function useFieldError(name) {
  const {
    formState: { errors },
  } = useFormContext();
  return get(errors, name)?.message;
}

/** Label + control + hint + error, with ids wired for accessibility. */
export function Field({ name, label, hint, children, className = '', optional }) {
  const id = useId();
  const error = useFieldError(name);
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {optional && <span className="ml-1.5 text-xs font-normal text-faint">optional</span>}
        </label>
      )}
      {children({ id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({ name, label, hint, optional, className, ...inputProps }) {
  const { register } = useFormContext();
  return (
    <Field name={name} label={label} hint={hint} optional={optional} className={className}>
      {(a11y) => <input className="input" {...a11y} {...inputProps} {...register(name)} />}
    </Field>
  );
}

export function SelectField({ name, label, options, placeholder = 'Select…', optional, className, hint }) {
  const { register } = useFormContext();
  return (
    <Field name={name} label={label} optional={optional} className={className} hint={hint}>
      {(a11y) => (
        <select className="input" {...a11y} {...register(name)}>
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function StepHeader({ title, helper, children }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {helper && <p className="mt-1 max-w-2xl text-sm text-muted">{helper}</p>}
      </div>
      {children}
    </div>
  );
}

/** Markdown editor with word counter and live-preview toggle. */
export function MarkdownField({ name, label, helper, height = 460, showHeader = true }) {
  const { control } = useFormContext();
  const [livePreview, setLivePreview] = useState(false);
  const value = useWatch({ control, name }) ?? '';
  const words = countWords(value);
  const id = useId();

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-4">
        {showHeader ? (
          <div>
            <label htmlFor={id} className="label mb-0">
              {label}
            </label>
            {helper && <p className="hint mt-0.5">{helper}</p>}
          </div>
        ) : (
          <span />
        )}
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-muted select-none">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={livePreview} onChange={(e) => setLivePreview(e.target.checked)} />
          Live preview
        </label>
      </div>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <MDEditor
            value={field.value}
            onChange={(v) => field.onChange(v ?? '')}
            onBlur={field.onBlur}
            preview={livePreview ? 'live' : 'edit'}
            height={height}
            minHeight={240}
            visibleDragbar
            textareaProps={{ id, 'aria-label': label, spellCheck: true }}
            previewOptions={{ rehypePlugins: sanitizePlugins }}
          />
        )}
      />
      <p className="num mt-1.5 text-right text-xs text-faint" aria-live="polite">
        {words.toLocaleString()} {words === 1 ? 'word' : 'words'} · ~{Math.max(words ? 1 : 0, Math.ceil(words / 220))} min read
      </p>
    </div>
  );
}

const MAX_UPLOAD = 5 * 1024 * 1024;
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

/** Upload to /admin/uploads (Cloudinary) with preview; a pasted URL also works. */
export function ImageUploadField({ name, label, hint, aspect = 'aspect-[16/9]', fit = 'object-cover' }) {
  const { control, setValue } = useFormContext();
  const value = useWatch({ control, name });
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const toast = useToast();
  const error = useFieldError(name);

  async function onFile(file) {
    if (!file) return;
    if (!ACCEPT.includes(file.type)) return toast.error('Unsupported image', 'Use a JPG, PNG or WebP file.');
    if (file.size > MAX_UPLOAD) return toast.error('Image too large', 'The maximum size is 5 MB.');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api('/admin/uploads', { method: 'POST', body: form });
      setValue(name, res.url, { shouldDirty: true, shouldValidate: true });
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(
        'Upload failed',
        err.code === 'UPLOADS_NOT_CONFIGURED' ? 'Image uploads are not set up on the API (CLOUDINARY_URL). Paste an image URL instead.' : err.message,
      );
      if (err.code === 'UPLOADS_NOT_CONFIGURED') setShowUrl(true);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex items-start gap-4">
        <div className={`relative grid w-48 shrink-0 place-items-center overflow-hidden rounded-md border border-dashed border-line-strong bg-surface-2 ${aspect}`}>
          {value ? (
            <img src={value} alt={`${label} preview`} className={`size-full ${fit}`} />
          ) : (
            <Icon name="upload" className="size-5 text-faint" />
          )}
          {uploading && (
            <div className="absolute inset-0 grid place-items-center bg-surface/70">
              <Spinner className="size-5 text-accent" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <input ref={inputRef} type="file" accept={ACCEPT.join(',')} className="sr-only" tabIndex={-1} onChange={(e) => onFile(e.target.files?.[0])} aria-hidden="true" />
            <Button size="sm" icon="upload" loading={uploading} onClick={() => inputRef.current?.click()}>
              {value ? 'Replace' : 'Upload'}
            </Button>
            {value && (
              <Button size="sm" variant="ghost" icon="trash" onClick={() => setValue(name, '', { shouldDirty: true, shouldValidate: true })}>
                Remove
              </Button>
            )}
            <Button size="sm" variant="ghost" icon="link" aria-expanded={showUrl} onClick={() => setShowUrl((s) => !s)}>
              Use a URL
            </Button>
          </div>
          {showUrl && <TextField name={name} aria-label={`${label} URL`} type="url" />}
          {hint && <p className="hint">{hint}</p>}
          {error && !showUrl && <p className="field-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}

/** Chips input for string arrays. Enter or comma adds; Backspace on empty removes the last. */
export function TagInputField({ name, label, hint }) {
  const { control } = useFormContext();
  const [draft, setDraft] = useState('');
  const id = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const tags = field.value ?? [];
        const add = () => {
          const t = draft.trim().replace(/,$/, '').trim();
          if (t && !tags.some((x) => x.toLowerCase() === t.toLowerCase())) field.onChange([...tags, t]);
          setDraft('');
        };
        return (
          <div>
            <label htmlFor={id} className="label">
              {label} <span className="ml-1.5 text-xs font-normal text-faint">optional</span>
            </label>
            <div className="input flex min-h-[38px] flex-wrap items-center gap-1.5 !py-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
              {tags.map((t, i) => (
                <span key={t} className="inline-flex items-center gap-1 rounded bg-surface-2 py-0.5 pr-1 pl-2 text-sm">
                  {t}
                  <button
                    type="button"
                    className="rounded p-0.5 text-faint hover:text-ink"
                    aria-label={`Remove ${t}`}
                    onClick={() => field.onChange(tags.filter((_, j) => j !== i))}
                  >
                    <Icon name="x" className="size-3" />
                  </button>
                </span>
              ))}
              <input
                id={id}
                className="min-w-[8rem] flex-1 bg-transparent py-0.5 text-sm outline-none"
                value={draft}
                onChange={(e) => (e.target.value.endsWith(',') ? (setDraft(e.target.value), setTimeout(add)) : setDraft(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    add();
                  } else if (e.key === 'Backspace' && !draft && tags.length) {
                    field.onChange(tags.slice(0, -1));
                  }
                }}
                onBlur={add}
                aria-describedby={hint ? `${id}-hint` : undefined}
              />
            </div>
            {hint && (
              <p id={`${id}-hint`} className="hint">
                {hint}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}

/** Vertical drag-to-reorder list (pointer + keyboard). `items` are useFieldArray fields. */
export function SortableList({ items, onMove, children }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVertical]}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) return;
        const from = items.findIndex((i) => i.id === active.id);
        const to = items.findIndex((i) => i.id === over.id);
        if (from !== -1 && to !== -1) onMove(from, to);
      }}
      accessibility={{
        screenReaderInstructions: { draggable: 'To reorder, press Space, use the arrow keys to move, then press Space again to drop.' },
      }}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export function SortableRow({ id, label, children }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`flex items-start gap-2 rounded-md border bg-surface p-2 ${isDragging ? 'relative z-10 border-accent shadow-lg' : 'border-line'}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${label}`}
        className="mt-1.5 cursor-grab touch-none rounded p-1 text-faint hover:bg-surface-2 hover:text-ink active:cursor-grabbing"
      >
        <Icon name="grip" className="size-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

export function RemoveRowButton({ onClick, label }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title="Remove" className="mt-1.5 rounded p-1.5 text-faint hover:bg-danger-soft hover:text-danger">
      <Icon name="trash" className="size-4" />
    </button>
  );
}
