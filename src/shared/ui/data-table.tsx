import { type ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "Brak danych",
  className = "",
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-edu-border-strong bg-edu-bg-subtle/40 py-10 text-center text-sm font-medium text-edu-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto rounded-xl border border-edu-border shadow-edu-sm ${className}`}>
      <table className="min-w-full divide-y divide-edu-border">
        <thead className="bg-edu-bg-subtle">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-edu-muted ${col.className ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-edu-border bg-edu-surface">
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              className="transition-colors duration-150 hover:bg-edu-bg-subtle/80"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`whitespace-nowrap px-4 py-3 text-sm font-medium text-edu-ink ${col.className ?? ""}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
