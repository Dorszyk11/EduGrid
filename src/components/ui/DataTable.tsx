import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Render komórki dla wiersza (index = pozycja w widocznej liście). */
  render: (row: T, index: number) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string | number;
  loading?: boolean;
  error?: string | null;
  /** Treść gdy brak wierszy (np. „Brak nauczycieli. Dodaj pierwszego."). */
  empty?: ReactNode;
  /** Klasa wiersza (np. podświetlenie). */
  rowClassName?: (row: T) => string;
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

/**
 * Tabela danych — sygnatura „ledger": nagłówek na surface-2, włosowe linie,
 * tabularne liczby. Obsługuje stany loading / error / empty.
 */
export default function DataTable<T>({
  columns,
  rows,
  getRowKey,
  loading = false,
  error = null,
  empty = 'Brak danych.',
  rowClassName,
}: DataTableProps<T>) {
  const colCount = columns.length;

  return (
    <div className="overflow-x-auto rounded-card border border-line">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-surface-2 border-b border-line">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={`px-3 py-2.5 font-medium text-ink-soft ${alignClass[c.align ?? 'left']} ${c.className ?? ''}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`skeleton-${i}`} className="border-b border-line last:border-0">
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-3">
                    <span className="block h-3.5 w-3/4 animate-pulse rounded-sm bg-line" />
                  </td>
                ))}
              </tr>
            ))
          ) : error ? (
            <tr>
              <td colSpan={colCount} className="px-3 py-10 text-center text-sm text-danger">
                {error}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="px-3 py-10 text-center text-sm text-ink-faint">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={getRowKey(row, i)}
                className={`border-b border-line last:border-0 hover:bg-surface-2 ${rowClassName?.(row) ?? ''}`}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-2.5 text-ink ${alignClass[c.align ?? 'left']} ${c.className ?? ''}`}>
                    {c.render(row, i)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
