import { useEffect, useId, useRef, useState } from 'react';
import { Button } from './ui.jsx';
import { Icon } from './Icon.jsx';

/**
 * Accessible modal built on <dialog> (focus trap, Esc to close and inert background come for free).
 */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md' }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const width = { md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // backdrop click
      }}
      className={`m-auto w-[calc(100%-2rem)] ${width} rounded-xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-[2px]`}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 id={titleId} className="text-base font-semibold">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="rounded p-1 text-faint hover:text-ink" aria-label="Close">
              <Icon name="x" className="size-4" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

/** Delete confirmation that requires typing the exact name. */
export function ConfirmDeleteDialog({ open, onClose, name, onConfirm, loading }) {
  const [typed, setTyped] = useState('');
  const inputId = useId();
  useEffect(() => {
    if (open) setTyped('');
  }, [open]);
  const matches = typed.trim() === name?.trim();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Delete case study"
      description="This permanently removes it from the archive and the public site. It cannot be undone."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="danger" icon="trash" disabled={!matches} loading={loading} onClick={onConfirm}>
            Delete forever
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (matches) onConfirm();
        }}
      >
        <label htmlFor={inputId} className="label">
          Type <span className="rounded bg-surface-2 px-1 font-mono text-[13px]">{name}</span> to confirm
        </label>
        <input id={inputId} className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus />
      </form>
    </Dialog>
  );
}
