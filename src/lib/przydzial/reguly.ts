/**
 * Czyste reguły domenowe przydziału godzin (wydzielone z PlanMeinTabela, by były
 * testowalne). Zgodność z ramowymi planami MEiN — patrz Dz.U. 2025 poz. 363.
 */

/** W technikum w klasie V nie można dodawać zwykłych „godzin do wyboru” na te przedmioty. */
export const PRZEDMIOTY_BLOKOWANE_V_TECHNIKUM = ['Geografia', 'Biologia', 'Fizyka', 'Chemia'];

/** Godziny w zakresie rozszerzonym dodawane do „Zrealizowane godziny” (np. technikum/liceum 8). */
export function getGodzinyRozszerzenia(schoolType: string): number {
  const st = (schoolType || '').trim().toLowerCase();
  if (st === 'technikum') return 8;
  if (st.includes('liceum')) return 8;
  return 0;
}

/**
 * Czy można przydzielać w tej komórce.
 * forDirectorOrExtended=true → godziny dyrektorskie/rozszerzone można też na V
 * (geografia, biologia, chemia, fizyka).
 */
export function canPrzydzielacWKomorce(
  schoolType: string,
  grade: string,
  subjectName: string,
  forDirectorOrExtended?: boolean,
): boolean {
  const st = (schoolType || '').trim().toLowerCase();
  if (st !== 'technikum') return true;
  if (grade !== 'V') return true;
  if (forDirectorOrExtended) return true;
  return !PRZEDMIOTY_BLOKOWANE_V_TECHNIKUM.includes((subjectName || '').trim());
}

/** Kolor komórki „Suma godzin w roku” wg % godzin dodatkowych (do wyboru + dyrektorskie). */
export function kolorOdProcentuGodzinDodatkowych(procent: number): string {
  if (procent <= 25) return 'bg-emerald-100 text-emerald-800 ring-emerald-300';
  if (procent <= 35) return 'bg-amber-100 text-amber-800 ring-amber-300';
  if (procent <= 45) return 'bg-red-100 text-red-800 ring-red-300';
  if (procent <= 55) return 'bg-red-200 text-red-900 ring-red-400';
  return 'bg-red-400 text-red-950 ring-red-600 font-bold';
}
