/**
 * Czyste funkcje pomocnicze ekranu Dyspozycji — wydzielone z komponentu, by były
 * testowalne i deterministyczne. Dotyczą dopasowania planu MEiN do typu/rocznika klasy
 * oraz kluczy przydziału (spójnych z PlanMeinTabela).
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

/** Nie pokazywać w tabeli dyspozycji. */
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
  if (n.includes('i–v') || n.includes('i-v') || n.includes('1–5') || n.includes('1-5')) return 'Klasy I–V';
  if (n.includes('i–iv') || n.includes('i-iv') || n.includes('1–4') || n.includes('1-4')) return 'Klasy I–IV';
  if (n.includes('vii–viii') || n.includes('vii-viii') || n.includes('7–8') || n.includes('7-8')) return 'Klasy VII–VIII';
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

export interface PrzedmiotDyspozycjaRow {
  nazwa: string;
  godziny: number;
  doPrzydzielenia: number;
}

/**
 * Godziny przedmiotów na dany rok cyklu = baza z planu (×2 przy podziale na grupy)
 * + przydział + dyrektorskie + rozszerzenia/doradztwo. `doPrzydzielenia` = godziny − już przypisane.
 * Czysta funkcja — wydzielona z ekranu Dyspozycji, by była testowalna.
 */
export function obliczPrzedmiotyDlaRoku(
  plan: PlanItem,
  selectedRok: string,
  przydzialData: PrzydzialData | null,
  przedmioty: PrzedmiotRef[],
  assignedGodziny: Record<string, Record<string, number>> | null,
): PrzedmiotDyspozycjaRow[] {
  const przedmiotIdDlaNazwyNow = (nazwa: string): string | null => {
    const n = (nazwa || '').trim();
    const exact = przedmioty.find((p) => (p.nazwa || '').trim() === n);
    if (exact) return exact.id;
    const lower = n.toLowerCase();
    const fuzzy = przedmioty.find((p) => (p.nazwa || '').trim().toLowerCase() === lower);
    return fuzzy ? fuzzy.id : null;
  };
  return plan.subjects
    .filter(isSubjectRow)
    .filter((row) => !pominWyswietlanie(row.subject ?? ''))
    .map((row) => {
      const nazwa = row.subject ?? '—';
      const subKey = subjectKey(plan.plan_id, nazwa);
      const base = row.hours_by_grade?.[selectedRok] ?? 0;
      const jestPodzial = przydzialData?.podzialNaGrupy?.[subKey]?.[selectedRok];
      const p = jestPodzial
        ? sumGrupy(przydzialData?.przydzialGrupy?.[subKey]?.[selectedRok])
        : (przydzialData?.przydzial?.[subKey]?.[selectedRok] ?? 0);
      const d = jestPodzial
        ? sumGrupy(przydzialData?.dyrektorGrupy?.[subKey]?.[selectedRok])
        : (przydzialData?.dyrektor?.[subKey]?.[selectedRok] ?? 0);
      let godziny: number;
      if (isPrzedmiotLaczny(nazwa)) {
        godziny = przydzialData?.doradztwo?.[subKey]?.[selectedRok] ?? 0;
      } else if (isPrzedmiotRozszerzony(nazwa)) {
        const planPrefix = (plan.plan_id ?? 'plan') + '_';
        godziny = (przydzialData?.rozszerzenia ?? [])
          .filter((k) => k.startsWith(planPrefix))
          .reduce((s, k) => {
            const jp = przydzialData?.podzialNaGrupy?.[k]?.[selectedRok];
            const v = jp
              ? sumGrupy(przydzialData?.rozszerzeniaGrupy?.[k]?.[selectedRok])
              : (przydzialData?.rozszerzeniaPrzydzial?.[k]?.[selectedRok] ?? 0);
            return s + v;
          }, 0);
      } else {
        const rozsz = przydzialData?.rozszerzenia?.includes(subKey)
          ? (przydzialData?.podzialNaGrupy?.[subKey]?.[selectedRok]
              ? sumGrupy(przydzialData?.rozszerzeniaGrupy?.[subKey]?.[selectedRok])
              : (przydzialData?.rozszerzeniaPrzydzial?.[subKey]?.[selectedRok] ?? 0))
          : 0;
        const baseEffective = jestPodzial ? base * 2 : base;
        godziny = baseEffective + p + d + rozsz;
      }
      const pid = przedmiotIdDlaNazwyNow(nazwa);
      const przypisane = pid ? (assignedGodziny?.[pid]?.[selectedRok] ?? 0) : 0;
      const doPrzydzielenia = Math.max(0, godziny - przypisane);
      return { nazwa, godziny, doPrzydzielenia };
    });
}
