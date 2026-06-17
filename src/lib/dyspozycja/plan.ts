/**
 * Logika ekranu Dyspozycji. Wspólne funkcje ramowych planów pochodzą z `../ramowePlany`
 * (re-eksport — istniejące importy `@/lib/dyspozycja/plan` pozostają zgodne).
 */
export * from '../ramowePlany';

import {
  type PlanItem,
  type PrzydzialData,
  type PrzedmiotRef,
  isSubjectRow,
  pominWyswietlanie,
  subjectKey,
  isPrzedmiotLaczny,
  isPrzedmiotRozszerzony,
  sumGrupy,
} from '../ramowePlany';

export interface PrzedmiotDyspozycjaRow {
  nazwa: string;
  godziny: number;
  doPrzydzielenia: number;
}

/**
 * Godziny przedmiotów na dany rok cyklu = baza z planu (×2 przy podziale na grupy)
 * + przydział + dyrektorskie + rozszerzenia/doradztwo. `doPrzydzielenia` = godziny − już przypisane.
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
