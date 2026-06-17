'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import Icon, { type IconName } from './Icon';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_ACCENT: Record<ToastTone, string> = {
  success: 'text-ok',
  error: 'text-danger',
  info: 'text-accent',
};

const TONE_ICON: Record<ToastTone, IconName> = {
  success: 'success',
  error: 'warning',
  info: 'info',
};

const AUTO_DISMISS_MS = 4000;
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const remove = useCallback(
    (id: number) => setToasts((list) => list.filter((t) => t.id !== id)),
    [],
  );

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId++;
      setToasts((list) => [...list, { id, tone, message }]);
      setTimeout(() => remove(id), AUTO_DISMISS_MS);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed right-4 top-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
            {toasts.map((t) => (
              <div
                key={t.id}
                role={t.tone === 'error' ? 'alert' : 'status'}
                aria-live={t.tone === 'error' ? 'assertive' : 'polite'}
                className="page-enter flex items-start gap-2 rounded-card border border-line bg-surface px-3 py-2.5 text-sm shadow-pop"
              >
                <Icon name={TONE_ICON[t.tone]} size={16} className={`mt-0.5 shrink-0 ${TONE_ACCENT[t.tone]}`} />
                <span className="flex-1 text-ink">{t.message}</span>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  aria-label="Zamknij powiadomienie"
                  className="text-ink-faint hover:text-ink"
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

/** Dostęp do API toastów. Wymaga `<ToastProvider>` w drzewie (jest w root layoutcie). */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast musi być użyty wewnątrz <ToastProvider>');
  }
  return ctx;
}
