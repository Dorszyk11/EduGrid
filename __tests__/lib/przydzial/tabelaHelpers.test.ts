import { getUnit, cellDisplay, totalDisplay, cycleFilterZNazwy } from '@/lib/przydzial/tabelaHelpers';
import type { PlanMein, SubjectRow } from '@/lib/przydzial/typy';

describe('cycleFilterZNazwy', () => {
  it('rozpoznaje wszystkie zakresy klas', () => {
    expect(cycleFilterZNazwy('Szkoła podstawowa, Klasy I–III')).toBe('Klasy I–III');
    expect(cycleFilterZNazwy('Klasy IV–VIII')).toBe('Klasy IV–VIII');
    expect(cycleFilterZNazwy('Technikum, Klasy I–V')).toBe('Klasy I–V');
    expect(cycleFilterZNazwy('Liceum, Klasy I–IV')).toBe('Klasy I–IV');
    expect(cycleFilterZNazwy('Oddziały, Klasy VII–VIII')).toBe('Klasy VII–VIII');
  });
  it('brak dopasowania → undefined', () => {
    expect(cycleFilterZNazwy('Liceum ogólnokształcące')).toBeUndefined();
    expect(cycleFilterZNazwy('')).toBeUndefined();
  });
});

describe('getUnit', () => {
  it('zwraca jednostkę z table_structure', () => {
    expect(getUnit({ table_structure: { unit: 'godz/tydz' } } as unknown as PlanMein)).toBe('godz/tydz');
  });
  it('brak → undefined', () => {
    expect(getUnit({} as unknown as PlanMein)).toBeUndefined();
  });
});

describe('cellDisplay', () => {
  const row = { hours_by_grade: { I: 3 }, raw: { I: '3*' } } as unknown as SubjectRow;
  it('preferRaw → wartość surowa', () => {
    expect(cellDisplay(row, 'I', true)).toBe('3*');
  });
  it('bez preferRaw → liczba jako string', () => {
    expect(cellDisplay(row, 'I', false)).toBe('3');
  });
  it('brak danych → myślnik', () => {
    expect(cellDisplay({} as SubjectRow, 'I', false)).toBe('–');
  });
});

describe('totalDisplay (ścieżki tekstowe)', () => {
  it('rozszerzony bez raw → 0', () => {
    expect(totalDisplay({ subject: 'Biologia w zakresie rozszerzonym' } as SubjectRow)).toBe('0');
  });
  it('zwykły z total_hours → liczba', () => {
    expect(totalDisplay({ subject: 'Matematyka', total_hours: 14 } as SubjectRow)).toBe('14');
  });
  it('brak total i raw, brak hours_to_choose → 0', () => {
    expect(totalDisplay({ subject: 'X' } as SubjectRow)).toBe('0');
  });
});
