import type { ReactNode } from 'react';
import type { PlanMein, SubjectRow } from '@/lib/przydzial/typy';
import { isPrzedmiotRozszerzony } from '@/lib/przydzial/plany-mein';

/**
 * Zapis do localStorage jako nietrwały cache (źródłem prawdy jest API/baza).
 * Zapis bywa niemożliwy (przekroczona quota, tryb prywatny, wyłączony storage) –
 * wtedy cache pomijamy świadomie i logujemy w trybie debug, zamiast cicho połykać błąd.
 */
export function cacheSet(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.debug('Pominięto zapis cache localStorage:', key, err);
  }
}

export function getUnit(plan: PlanMein): string | undefined {
  return plan.table_structure?.unit;
}

export function cellDisplay(row: SubjectRow, grade: string, preferRaw: boolean): ReactNode {
  const raw = row.raw?.[grade];
  const val = row.hours_by_grade?.[grade];
  if (preferRaw && raw !== undefined && raw !== '') return raw;
  if (val !== undefined && val !== null) return String(val);
  return '–';
}

export function totalDisplay(row: SubjectRow): ReactNode {
  const r = row.raw?.razem;
  const t = row.total_hours;
  // Wiersz „przedmioty o zakresie rozszerzonym” – w kolumnie Razem domyślnie 0 (nie pokazujemy planowych 8/22)
  if (row.subject && isPrzedmiotRozszerzony(row.subject)) {
    if (r !== undefined && r !== '') return <span title="Wartość z tabeli">{r}</span>;
    return '0';
  }
  if (r !== undefined && r !== '') return <span title="Wartość z tabeli">{r}</span>;
  if (t !== undefined && t !== null) return String(t);
  if (row.hours_to_choose != null) {
    return <span className="text-ink-faint">min. {row.hours_to_choose}</span>;
  }
  return '0';
}

/** Z nazwy typu (np. "Technikum, Klasy I–V") wyciąga filtr cyklu – żeby pokazać tylko jeden etap. */
export function cycleFilterZNazwy(nazwaTypu: string): string | undefined {
  const n = (nazwaTypu || '').toLowerCase();
  if (n.includes('i–iii') || n.includes('i-iii') || n.includes('1–3') || n.includes('1-3')) return 'Klasy I–III';
  if (n.includes('iv–viii') || n.includes('iv-viii') || n.includes('4–8') || n.includes('4-8')) return 'Klasy IV–VIII';
  if (n.includes('vii–viii') || n.includes('vii-viii') || n.includes('7–8') || n.includes('7-8')) return 'Klasy VII–VIII';
  if (n.includes('i–v') || n.includes('i-v') || n.includes('1–5') || n.includes('1-5')) return 'Klasy I–V';
  if (n.includes('i–iv') || n.includes('i-iv') || n.includes('1–4') || n.includes('1-4')) return 'Klasy I–IV';
  return undefined;
}
