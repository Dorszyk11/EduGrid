/**
 * Czyste predykaty i pomocniki rozpoznające strukturę planów ramowych MEiN.
 * Wydzielone z tras (generuj, przydziel-godziny-rozszerzen) i komponentu
 * PlanMeinTabela, gdzie były kopiowane — jedno źródło prawdy.
 */
import type { DirectorRow, HoursByGrade, PlanMein, SubjectRow } from './typy';

/** Przedmioty, których godziny liczone są łącznie dla całego cyklu (nie per rocznik). */
const PRZEDMIOTY_LACZNE_CYKL = ['Zajęcia z zakresu doradztwa zawodowego'];

/** Czy wiersz to pula godzin do dyspozycji dyrektora (a nie zwykły przedmiot). */
export function isDirectorRow(entry: SubjectRow | DirectorRow): entry is DirectorRow {
  return 'director_discretion_hours' in entry && !('subject' in entry);
}

/** Roczniki planu (z table_structure lub płaskiej listy grades). */
export function getGrades(plan: PlanMein): string[] {
  return plan.table_structure?.grades ?? plan.grades ?? [];
}

/**
 * Dopasowanie typu szkoły z bazy do school_type z planu MEiN.
 * Pozwala na prefiks zakończony przecinkiem (np. "Technikum, ..." pasuje do "Technikum").
 */
export function matchSchoolType(nazwaTypu: string, schoolType: string): boolean {
  const a = (nazwaTypu || '').trim().toLowerCase();
  const b = (schoolType || '').trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.startsWith(b) && (a.length === b.length || a.charAt(b.length) === ',')) return true;
  return false;
}

/** Czy przedmiot ma godziny liczone łącznie dla cyklu (np. doradztwo zawodowe). */
export function isPrzedmiotLaczny(subjectName: string): boolean {
  return PRZEDMIOTY_LACZNE_CYKL.some((n) => (subjectName || '').trim() === n);
}

/** Czy wiersz reprezentuje przedmioty w zakresie rozszerzonym (wspólna pula rozszerzeń). */
export function isPrzedmiotRozszerzony(subjectName: string): boolean {
  return /w\s+zakresie\s+rozszerzonym|przedmioty\s+.*\s+rozszerz/i.test((subjectName || '').trim());
}

/** Stabilny klucz przedmiotu w obrębie planu (plan_id + nazwa). */
export function subjectKey(planId: string | undefined, subjectName: string): string {
  return `${planId ?? 'plan'}_${(subjectName || '').trim()}`;
}

/**
 * Limity godzin rozszerzeń na rocznik (łączna pula dla wszystkich przedmiotów
 * rozszerzonych) – z pierwszego wiersza „przedmioty w zakresie rozszerzonym”.
 */
export function getLimityRozszerzenNaRok(plans: PlanMein[]): HoursByGrade {
  const byGrade: HoursByGrade = {};
  for (const plan of plans) {
    for (const entry of plan.subjects) {
      if (isDirectorRow(entry)) continue;
      const row = entry as SubjectRow;
      if (!isPrzedmiotRozszerzony(row.subject ?? '')) continue;
      const hoursByGrade = row.hours_by_grade ?? {};
      for (const g of getGrades(plan)) {
        byGrade[g] = hoursByGrade[g] ?? 0;
      }
      return byGrade;
    }
  }
  return byGrade;
}
