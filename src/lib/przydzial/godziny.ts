/**
 * Czyste, deterministyczne jądra obliczeniowe przydziału godzin.
 * Serce aplikacji — wydzielone z tras i komponentu, by były testowalne
 * i nie zależały od stanu React/bazy. Żadna funkcja nie mutuje wejścia.
 */
import type { HoursByGrade, PrzydzialGrupyByGrade } from './typy';

/** Suma wszystkich godzin w mapie rocznik→godziny. */
export function sumaGodzin(byGrade: HoursByGrade | undefined): number {
  if (!byGrade) return 0;
  let sum = 0;
  for (const v of Object.values(byGrade)) sum += v || 0;
  return sum;
}

/**
 * Uzupełnia tylko nierozdysponowane godziny do wymaganej sumy:
 * już przydzielone roczniki zostawia bez zmian, a brakujące godziny dokłada
 * po jednej, zawsze do najmniej obciążonego rocznika (równe wyrównanie).
 * Zwraca nową mapę – nie mutuje `current`.
 */
export function uzupelnijNierozdysponowane(
  current: HoursByGrade,
  totalRequired: number,
  grades: string[]
): HoursByGrade {
  if (grades.length === 0 || totalRequired <= 0) return { ...current };

  const result: HoursByGrade = {};
  let assigned = 0;
  for (const g of grades) {
    const v = current[g] ?? 0;
    result[g] = v;
    assigned += v;
  }

  const remaining = totalRequired - assigned;
  if (remaining <= 0) return result;

  for (let i = 0; i < remaining; i++) {
    const g = grades.reduce(
      (min, gr) => ((result[gr] ?? 0) < (result[min] ?? 0) ? gr : min),
      grades[0]
    );
    result[g] = (result[g] ?? 0) + 1;
  }
  return result;
}

/**
 * Rozdziela wspólną pulę godzin rozszerzeń (limity per rocznik) między przedmioty
 * rozszerzone metodą round‑robin: dla każdego rocznika dokłada `limitG` godzin,
 * cyklicznie po kolejnych przedmiotach. Gdy brak limitu dla rocznika – pomija go.
 * Zwraca nową mapę przydziału – nie mutuje `current`.
 *
 * @param current             dotychczasowy przydzial (subKey → rocznik → godziny)
 * @param extendedKeysOrdered  klucze przedmiotów rozszerzonych w stałej kolejności
 * @param limityNaRok          limit godzin rozszerzeń per rocznik
 * @param gradesOrder          kolejność roczników
 */
export function rozdzielRozszerzenia(
  current: Record<string, HoursByGrade>,
  extendedKeysOrdered: string[],
  limityNaRok: HoursByGrade,
  gradesOrder: string[]
): Record<string, HoursByGrade> {
  // Głęboka kopia wejścia (bez mutacji stanu wywołującego)
  const result: Record<string, HoursByGrade> = {};
  for (const [k, byGrade] of Object.entries(current)) {
    result[k] = { ...byGrade };
  }

  const n = extendedKeysOrdered.length;
  if (n === 0 || gradesOrder.length === 0) return result;

  for (const g of gradesOrder) {
    const limitG = limityNaRok[g] ?? 0;
    if (limitG <= 0) continue;
    for (let k = 0; k < limitG; k++) {
      const subKey = extendedKeysOrdered[k % n];
      if (!result[subKey]) result[subKey] = {};
      result[subKey][g] = (result[subKey][g] ?? 0) + 1;
    }
  }
  return result;
}

/**
 * Suma przypisanych godzin dyrektorskich dla danego planu: zwykłe godziny
 * dyrektorskie + godziny dyrektorskie z podziałem na grupy (liczy się większa
 * z grup 1/2, bo grupy uczą się równolegle).
 */
export function sumaGodzinDyrektorskichDlaPlanu(
  dyrektor: Record<string, HoursByGrade>,
  przydzialGrupyDyrektor: Record<string, PrzydzialGrupyByGrade>,
  planId: string | undefined
): number {
  const prefix = (planId ?? 'plan') + '_';
  let sum = 0;
  for (const [key, byGrade] of Object.entries(dyrektor)) {
    if (!key.startsWith(prefix)) continue;
    sum += sumaGodzin(byGrade);
  }
  for (const [key, byGrade] of Object.entries(przydzialGrupyDyrektor)) {
    if (!key.startsWith(prefix)) continue;
    for (const gr of Object.values(byGrade)) {
      if (gr && typeof gr === 'object') sum += Math.max(gr[1] ?? 0, gr[2] ?? 0);
    }
  }
  return sum;
}

/**
 * Czy dodanie `dodawane` godzin dyrektorskich przekroczy pulę dyrektora.
 * `pula` to total_hours z wiersza director_discretion_hours.
 */
export function czyPrzekraczaPuleDyrektora(
  jużPrzypisane: number,
  pula: number,
  dodawane: number = 1
): boolean {
  return jużPrzypisane + dodawane > pula;
}
