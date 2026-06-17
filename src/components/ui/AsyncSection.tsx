import type { ReactNode } from 'react';

interface AsyncSectionProps {
  loading: boolean;
  error?: string | null;
  children: ReactNode;
  loadingLabel?: string;
}

/**
 * Spójny stan loading/error dla treści NIE-tabelarycznej (strony szczegółów).
 * Tabele używają wbudowanych stanów `DataTable`.
 */
export default function AsyncSection({
  loading,
  error,
  children,
  loadingLabel = 'Ładowanie...',
}: AsyncSectionProps) {
  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-accent" />
          <p className="mt-3 text-sm text-ink-soft">{loadingLabel}</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-card border border-danger bg-danger-bg p-4 text-sm text-danger">
        {error}
      </div>
    );
  }
  return <>{children}</>;
}
