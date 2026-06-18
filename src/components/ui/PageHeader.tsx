'use client';

import type { ReactNode } from 'react';
import { usePageChrome } from '@/lib/hooks/usePageChrome';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Akcje w prawym górnym rogu (selektory, eksport itp.). */
  actions?: ReactNode;
}

/**
 * Adapter chrome strony. Pod powłoką (`AppShell`/`PageChromeProvider`) deleguje
 * tytuł/opis/akcje do sticky `AppBar` i nie renderuje nic w treści — dzięki
 * temu ekrany pozostają bez zmian. Bez Providera (np. ekran poza powłoką)
 * renderuje klasyczny nagłówek in-place jako fallback (brak utraty tytułu).
 */
export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  const przejeteByAppBar = usePageChrome({ title, description, actions });

  if (przejeteByAppBar) return null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
