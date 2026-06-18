'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

export type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId?: string;
  initialFocus?: 'first' | 'last';
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
}

const SIZE: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

/**
 * Bazowy, dostępny dialog: overlay na tokenach, focus-trap (Tab/Shift+Tab cyklicznie),
 * Esc/klik-overlay = zamknięcie, przywrócenie focusu na element wyzwalający po zamknięciu.
 * Zachowanie wyjęte z dawnego ConfirmDialog.
 */
export default function Modal({
  open,
  onClose,
  title,
  titleId,
  initialFocus = 'last',
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const headingId = titleId ?? generatedId;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    const focusables = getFocusable();
    const initial =
      initialFocus === 'first' ? focusables[0] : focusables[focusables.length - 1];
    const timer = setTimeout(() => initial?.focus(), 0);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const items = getFocusable();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, initialFocus, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className={`w-full ${SIZE[size]} rounded-card bg-surface p-5 shadow-pop`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={headingId} className="font-display text-lg font-semibold text-ink">
          {title}
        </h2>
        {children}
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
