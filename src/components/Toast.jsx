import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: 'check', cls: 'text-accent-text' },
  error: { icon: 'alert', cls: 'text-danger' },
  info: { icon: 'info', cls: 'text-muted' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (type, title, description, { duration } = {}) => {
      const id = ++idRef.current;
      setToasts((t) => [...t.slice(-3), { id, type, title, description }]);
      setTimeout(() => dismiss(id), duration ?? (type === 'error' ? 7000 : 3500));
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (title, description, opts) => push('success', title, description, opts),
      error: (title, description, opts) => push('error', title, description, opts),
      info: (title, description, opts) => push('info', title, description, opts),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[22rem] flex-col gap-2" role="region" aria-label="Notifications">
        {toasts.map((t) => {
          const s = STYLES[t.type];
          return (
            <div
              key={t.id}
              role={t.type === 'error' ? 'alert' : 'status'}
              className="card pointer-events-auto flex items-start gap-3 p-3.5 shadow-lg shadow-black/5"
            >
              <Icon name={s.icon} className={`mt-0.5 size-4 shrink-0 ${s.cls}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t.title}</p>
                {t.description && <p className="mt-0.5 text-sm break-words text-muted">{t.description}</p>}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} className="rounded p-0.5 text-faint hover:text-ink" aria-label="Dismiss notification">
                <Icon name="x" className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
