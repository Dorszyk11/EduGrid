/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import DataTable, { type Column } from '@/components/ui/DataTable';

interface Wiersz {
  id: number;
  nazwa: string;
  liczba: number;
}

const kolumny: Column<Wiersz>[] = [
  { key: 'nazwa', header: 'Nazwa', sticky: true, render: (r) => r.nazwa },
  { key: 'liczba', header: 'Liczba', align: 'right', separator: true, render: (r) => r.liczba },
];

const wiersze: Wiersz[] = [
  { id: 1, nazwa: 'Alfa', liczba: 3 },
  { id: 2, nazwa: 'Beta', liczba: 7 },
];

function renderTable(props: Partial<React.ComponentProps<typeof DataTable<Wiersz>>> = {}) {
  return render(
    <DataTable<Wiersz>
      columns={kolumny}
      rows={wiersze}
      getRowKey={(r) => r.id}
      {...props}
    />,
  );
}

describe('DataTable v2', () => {
  it('stickyHeader dodaje klasę sticky do th', () => {
    renderTable({ stickyHeader: true });
    const th = screen.getByRole('columnheader', { name: 'Liczba' });
    expect(th.className).toContain('sticky');
    expect(th.className).toContain('top-0');
  });

  it('bez stickyHeader th nie jest przyklejony do góry', () => {
    renderTable({ stickyHeader: false });
    const th = screen.getByRole('columnheader', { name: 'Liczba' });
    expect(th.className).not.toContain('top-0');
  });

  it('Column.sticky przykleja kolumnę do lewej (th i td)', () => {
    renderTable();
    const th = screen.getByRole('columnheader', { name: 'Nazwa' });
    expect(th.className).toContain('left-0');
  });

  it('Column.separator dodaje lewą linię rozdzielającą', () => {
    renderTable();
    const th = screen.getByRole('columnheader', { name: 'Liczba' });
    expect(th.className).toContain('border-l-2');
    expect(th.className).toContain('border-line-strong');
  });

  it('footer renderuje <tfoot>', () => {
    const { container } = renderTable({
      footer: (
        <>
          <td>Suma</td>
          <td>10</td>
        </>
      ),
    });
    const tfoot = container.querySelector('tfoot');
    expect(tfoot).not.toBeNull();
    expect(screen.getByText('Suma')).toBeInTheDocument();
  });

  it('nie renderuje <tfoot> bez prop footer', () => {
    const { container } = renderTable();
    expect(container.querySelector('tfoot')).toBeNull();
  });

  it('error ma role="status" i aria-live', () => {
    renderTable({ error: 'Błąd ładowania' });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Błąd ładowania');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('pusty stan ma role="status"', () => {
    renderTable({ rows: [], empty: 'Brak rekordów.' });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Brak rekordów.');
  });

  it('loading sygnalizuje stan przez role="status"', () => {
    renderTable({ loading: true });
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });
});
