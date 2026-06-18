import type { ReactNode } from 'react';

/**
 * Opakowanie pola formularza: etykieta powiązana z polem przez `htmlFor`, opcjonalna
 * podpowiedź i błąd (`role="alert"`). Dziecko (Input/Select) dostaje `id` oraz `aria-*`
 * od konsumenta; identyfikatory `${htmlFor}-hint` / `${htmlFor}-error` służą do `aria-describedby`.
 */
export default function Field({ label, htmlFor, hint, error, required, children }:
  { label: string; htmlFor: string; hint?: string; error?: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-soft mb-1">
        {label}{required && <span className="text-danger" aria-hidden> *</span>}
      </label>
      {children}
      {hint && !error && <p id={`${htmlFor}-hint`} className="mt-1 text-xs text-ink-faint">{hint}</p>}
      {error && <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
