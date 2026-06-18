'use client';

import { useId } from 'react';
import Button from './Button';
import Modal from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Dostępny modal potwierdzenia oparty na bazowym `Modal`: focus-trap, Esc/klik-overlay = anuluj,
 * przywrócenie focusu po zamknięciu. Danger → focus startowy na „Anuluj”. Zastępuje natywne `confirm()`.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Potwierdź',
  cancelLabel = 'Anuluj',
  tone = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      titleId={titleId}
      initialFocus={tone === 'danger' ? 'first' : 'last'}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && (
        <p id={descId} className="mt-2 text-sm text-ink-soft">
          {description}
        </p>
      )}
    </Modal>
  );
}
