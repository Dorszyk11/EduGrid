/**
 * Wspólne, czyste funkcje pracy z ramowymi planami nauczania MEiN — używane przez
 * ekrany Dyspozycji i Realizacji. Jedno źródło prawdy (koniec duplikacji między stronami).
 * Logika godzin/zgodności musi respektować Dz.U. 2025 poz. 363.
 */

export type HoursByGrade = Record<string, number>;
export type SubjectRow = {
  subject?: string;
  hours_by_grade?: HoursByGrade;
  director_discretion_hours?: unknown;
};
export type PlanItem = {
  plan_id?: string;
  school_type: string;
  cycle: string;
  table_structure?: { grades?: string[] };
  grades?: string[];
  subjects: SubjectRow[];
};

export interface PrzydzialData {
  przydzial: Record<string, Record<string, number>>;
  dyrektor: Record<string, Record<string, number>>;
  doradztwo: Record<string, Record<string, number>>;
  rozszerzenia: string[];
  rozszerzeniaPrzydzial: Record<string, Record<string, number>>;
  podzialNaGrupy?: Record<string, Record<string, boolean>>;
  przydzialGrupy?: Record<string, Record<string, { 1?: number; 2?: number }>>;
  dyrektorGrupy?: Record<string, Record<string, { 1?: number; 2?: number }>>;
  rozszerzeniaGrupy?: Record<string, Record<string, { 1?: number; 2?: number }>>;
}

export interface PrzedmiotRef {
  id: string;
  nazwa: string;
}

export function getGradesFromPlan(plan: PlanItem): string[] {
  return plan.table_structure?.grades ?? plan.grades ?? [];
}

/** Klucz jak w PlanMeinTabela – używany w przydziale. */
export function subjectKey(planId: string | undefined, subjectName: string): string {
  return `${planId ?? 'plan'}_${(subjectName || '').trim()}`;
}

const PRZEDMIOTY_LACZNE_CYKL = ['Zajęcia z zakresu doradztwa zawodowego'];

export function isPrzedmiotLaczny(subjectName: string): boolean {
  return PRZEDMIOTY_LACZNE_CYKL.some((n) => (subjectName || '').trim() === n);
}

export function isPrzedmiotRozszerzony(subjectName: string): boolean {
  return /w\s+zakresie\s+rozszerzonym|przedmioty\s+.*\s+rozszerz/i.test((subjectName || '').trim());
}

/** Nie pokazywać w tabeli (doradztwo/rozszerzenia liczone osobno). */
export function pominWyswietlanie(subjectName: string): boolean {
  const s = (subjectName || '').trim().toLowerCase();
  return s.includes('doradztwa zawodowego') || /w\s+zakresie\s+rozszerzonym|przedmioty\s+.*\s+rozszerz/.test(s);
}

/** Dopasowanie nazwy typu (np. "Technikum, Klasy I–V") do school_type z planu. */
export function matchSchoolType(nazwaTypu: string, schoolType: string): boolean {
  const a = (nazwaTypu || '').trim().toLowerCase();
  const b = (schoolType || '').trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.startsWith(b) && (a.length === b.length || a.charAt(b.length) === ',')) return true;
  return false;
}

export function cycleFilterZNazwy(nazwaTypu: string): string | undefined {
  const n = (nazwaTypu || '').toLowerCase();
  if (n.includes('i–iii') || n.includes('i-iii') || n.includes('1–3') || n.includes('1-3')) return 'Klasy I–III';
  if (n.includes('iv–viii') || n.includes('iv-viii') || n.includes('4–8') || n.includes('4-8')) return 'Klasy IV–VIII';
  if (n.includes('vii–viii') || n.includes('vii-viii') || n.includes('7–8') || n.includes('7-8')) return 'Klasy VII–VIII';
  if (n.includes('i–v') || n.includes('i-v') || n.includes('1–5') || n.includes('1-5')) return 'Klasy I–V';
  if (n.includes('i–iv') || n.includes('i-iv') || n.includes('1–4') || n.includes('1-4')) return 'Klasy I–IV';
  return undefined;
}

export function isSubjectRow(row: SubjectRow): row is SubjectRow & { subject: string } {
  return 'subject' in row && typeof (row as { subject?: string }).subject === 'string';
}

/** Suma godzin z obu grup: { 1: n1, 2: n2 } → n1 + n2 */
export function sumGrupy(gr: { 1?: number; 2?: number } | undefined): number {
  if (!gr) return 0;
  return (gr[1] ?? 0) + (gr[2] ?? 0);
}

/**
 * Rok w cyklu (I, II, III…) na podstawie rzeczywistej daty i cyklu klasy.
 * Klasa 1: wrzesień rok_poczatku – lipiec rok_poczatku+1
 * Klasa N: sierpień rok_poczatku+(N-1) – lipiec rok_poczatku+N
 */
export function aktualnyRokWCykle(rokSzkolny: string, rokiPlanu: string[], teraz: Date = new Date()): string {
  const m = rokSzkolny.match(/^(\d{4})[-/]\d{4}$/);
  const rokPoczatku = m ? parseInt(m[1], 10) : null;
  if (rokPoczatku == null || Number.isNaN(rokPoczatku) || rokiPlanu.length === 0) return rokiPlanu[0] ?? '';
  const currentYear = teraz.getFullYear();
  const currentMonth = teraz.getMonth() + 1; // 1–12
  let yearIndex: number;
  if (currentMonth >= 8) {
    yearIndex = currentYear - rokPoczatku;
  } else {
    yearIndex = currentYear - rokPoczatku - 1;
  }
  yearIndex = Math.max(0, Math.min(yearIndex, rokiPlanu.length - 1));
  return rokiPlanu[yearIndex] ?? rokiPlanu[0] ?? '';
}

/** Jedna linia planu realizacji: przedmiot + docelowe godziny w każdym roku. */
export interface PlanRow {
  nazwa: string;
  godzinyByGrade: Record<string, number>;
}

/**
 * Docelowe godziny per przedmiot/rok (Realizacja): baza z planu + przydział + dyrektor
 * + rozszerzenia/doradztwo. Bez podziału na grupy (ekran Realizacji nie używa grup).
 */
export function obliczPlanRzeczywisty(
  plan: PlanItem,
  rokiPlanu: string[],
  dane: PrzydzialData,
): PlanRow[] {
  return plan.subjects
    .filter(isSubjectRow)
    .filter((row) => !pominWyswietlanie(row.subject ?? ''))
    .map((row) => {
      const nazwa = row.subject ?? '—';
      const subKey = subjectKey(plan.plan_id, nazwa);
      const godzinyByGrade: Record<string, number> = {};
      for (const rok of rokiPlanu) {
        const base = row.hours_by_grade?.[rok] ?? 0;
        const p = dane.przydzial?.[subKey]?.[rok] ?? 0;
        const d = dane.dyrektor?.[subKey]?.[rok] ?? 0;
        let godziny: number;
        if (isPrzedmiotLaczny(nazwa)) {
          godziny = dane.doradztwo?.[subKey]?.[rok] ?? 0;
        } else if (isPrzedmiotRozszerzony(nazwa)) {
          const planPrefix = (plan.plan_id ?? 'plan') + '_';
          godziny = (dane.rozszerzenia ?? [])
            .filter((k) => k.startsWith(planPrefix))
            .reduce((s, k) => s + (dane.rozszerzeniaPrzydzial?.[k]?.[rok] ?? 0), 0);
        } else {
          const rozsz = dane.rozszerzenia?.includes(subKey)
            ? (dane.rozszerzeniaPrzydzial?.[subKey]?.[rok] ?? 0)
            : 0;
          godziny = base + p + d + rozsz;
        }
        godzinyByGrade[rok] = godziny;
      }
      return { nazwa, godzinyByGrade };
    });
}
