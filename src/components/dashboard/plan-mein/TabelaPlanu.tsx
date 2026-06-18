import { Fragment } from 'react';
import type { Dispatch, SetStateAction, MouseEvent as ReactMouseEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { useGroupSplit } from '@/hooks/useGroupSplit';
import GroupSplitCell from '../GroupSplitCell';
import { GroupSplitRazem, GroupSplitZrealizowane } from '../GroupSplitSummary';
import type { PrzydzialGrupyByGrade, SubjectRow, DirectorRow, PlanMein } from '@/lib/przydzial/typy';
import { isDirectorRow, isPrzedmiotLaczny, isPrzedmiotRozszerzony, subjectKey } from '@/lib/przydzial/plany-mein';
import { canPrzydzielacWKomorce, kolorOdProcentuGodzinDodatkowych } from '@/lib/przydzial/reguly';
import { totalDisplay } from '@/lib/przydzial/tabelaHelpers';
import { statusRealizacji, PUSTA, type TonStatusu } from '@/lib/status-realizacji';
import type { ModalPonadprogramowyState } from './ModalPonadprogramowy';

type GroupSplit = ReturnType<typeof useGroupSplit>;

/** Mapa tonu statusu → klasy tła/tekstu komórki „Zrealizowane” (tokeny, status nie samym kolorem). */
const TON_KOMORKA: Record<TonStatusu, string> = {
  ok: 'bg-ok-bg font-semibold text-ok ring-1 ring-ok/40 rounded-sm',
  warn: 'bg-warn-bg font-semibold text-warn ring-1 ring-warn/40 rounded-sm',
  danger: 'bg-danger-bg font-semibold text-danger ring-1 ring-danger/40 rounded-sm',
  accent: 'bg-accent-weak font-semibold text-accent-strong ring-1 ring-accent/40 rounded-sm',
};

/** Znacznik typu godziny — nie-kolorowy badge (status nie samym kolorem). */
function ZnacznikTyp({ children }: { children: ReactNode }) {
  return (
    <span className="ml-0.5 align-baseline text-[0.7em] font-semibold text-ink-faint">{children}</span>
  );
}

/**
 * Props klikalnej komórki dostępnej z klawiatury — odpowiednik `useKomorkaKlawiatura`,
 * ale jako zwykła funkcja (komórki powstają w `.map()`, więc nie wolno tu wołać hooka).
 * Enter/Space → `onActivate` (Space z `preventDefault`).
 */
function komorkaKlawiatura(onActivate: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e: ReactKeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        onActivate();
      }
    },
  };
}

/** Wspólna klasa fokusu klawiaturowego dla klikalnych komórek. */
const FOCUS_KOMORKA = 'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent';

/**
 * Główna tabela planu ramowego MEiN dla jednego planu (jeden <section>).
 * Wydzielona 1:1 z PlanMeinTabela (SP3 Krok 4). CZYSTO PREZENTACYJNA:
 * wszystkie obliczenia per-plan zostają w rodzicu i są przekazywane jako propsy
 * (nazwy propsów = dawne nazwy lokalne, JSX skopiowany bez zmian).
 */
export interface TabelaPlanuProps {
  plan: PlanMein;
  idx: number;
  grades: string[];
  unit: string | undefined;
  hasGrades: boolean;
  cycleLabel: string | undefined;
  isPodstawowka: boolean;
  totalDirectorHours: number;
  assignedDirectorHoursPlan: number;
  directorHoursRemainingRaw: number;
  remainingDirectorHours: number;
  sumByGrade: Record<string, number>;
  assignedSumByGrade: Record<string, number>;
  directorSumByGrade: Record<string, number>;
  totalGodzinyDoRozdysponowania: number;
  orderedSubjectsForTable: (SubjectRow | DirectorRow)[];
  extendedPoolAssignedTotal: number;
  extendedAssignedByGrade: Record<string, number>;
  planIdPrefix: string;
  extendedPoolSize: number;
  przydzial: Record<string, Record<string, number>>;
  dyrektor: Record<string, Record<string, number>>;
  rozszerzeniaPrzydzial: Record<string, Record<string, number>>;
  rozszerzeniaSubKeys: Set<string>;
  przydzialGrupyDyrektor: Record<string, PrzydzialGrupyByGrade>;
  przydzialGrupyRozszerzenia: Record<string, PrzydzialGrupyByGrade>;
  klasaId: string | undefined;
  tylkoOdczyt: boolean;
  trybPrzydzielGodzine: boolean;
  trybPrzydzielDyrektor: boolean;
  trybUsunGodzine: boolean;
  trybDodajRozszerzenia: boolean;
  trybPrzydzielGodzinyRozszerzen: boolean;
  trybPodzielNaGrupy: boolean;
  groupSplit: GroupSplit;
  setRozszerzeniaPrzydzial: Dispatch<SetStateAction<Record<string, Record<string, number>>>>;
  setRozszerzeniaSubKeys: Dispatch<SetStateAction<Set<string>>>;
  setExtendedCellsAdded: Dispatch<SetStateAction<Set<string>>>;
  setPrzydzialGrupyRozszerzenia: (v: Record<string, PrzydzialGrupyByGrade>) => void;
  setModalPonadprogramowa: Dispatch<SetStateAction<ModalPonadprogramowyState | null>>;
  zapiszRozszerzeniaDoBazy: (rozszerzenia: string[], rozszPrzydzial?: Record<string, Record<string, number>>, rozszGrupy?: Record<string, PrzydzialGrupyByGrade>) => void;
  przydzielGodzine: (subKey: string, grade: string, _hoursToChoose?: number, group?: 1 | 2) => void;
  cofnijGodzine: (subKey: string, grade: string, group?: 1 | 2) => void;
  dodajGodzineDyrektorska: (subKey: string, grade: string, _totalDirectorHours?: number, _planId?: string | undefined) => void;
  usunGodzineDyrektorska: (subKey: string, grade: string) => void;
  dodajGodzineRozszerzen: (subKey: string, grade: string) => void;
  cofnijGodzineRozszerzen: (grade: string, planIdPrefix: string, fromSubKey?: string) => void;
  togglePodzialNaGrupy: (subKey: string, grade: string) => void;
}

export default function TabelaPlanu({
  plan, idx, grades, unit, hasGrades, cycleLabel, isPodstawowka,
  totalDirectorHours, assignedDirectorHoursPlan, directorHoursRemainingRaw, remainingDirectorHours,
  sumByGrade, assignedSumByGrade, directorSumByGrade, totalGodzinyDoRozdysponowania,
  orderedSubjectsForTable, extendedPoolAssignedTotal, extendedAssignedByGrade, planIdPrefix, extendedPoolSize,
  przydzial, dyrektor, rozszerzeniaPrzydzial, rozszerzeniaSubKeys, przydzialGrupyDyrektor, przydzialGrupyRozszerzenia,
  klasaId, tylkoOdczyt, trybPrzydzielGodzine, trybPrzydzielDyrektor, trybUsunGodzine, trybDodajRozszerzenia,
  trybPrzydzielGodzinyRozszerzen, trybPodzielNaGrupy, groupSplit,
  setRozszerzeniaPrzydzial, setRozszerzeniaSubKeys, setExtendedCellsAdded, setPrzydzialGrupyRozszerzenia, setModalPonadprogramowa,
  zapiszRozszerzeniaDoBazy, przydzielGodzine, cofnijGodzine, dodajGodzineDyrektorska, usunGodzineDyrektorska,
  dodajGodzineRozszerzen, cofnijGodzineRozszerzen, togglePodzialNaGrupy,
}: TabelaPlanuProps) {
  return (
          <section
            className="bg-surface rounded-card border border-line overflow-hidden shadow-card w-full min-w-0"
          >
            <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-line">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-sm">
                {isPodstawowka ? (
                  <>
                    <span className="font-semibold text-ink">{cycleLabel}</span>
                    <span className="text-ink-faint text-xs">
                      Zał. nr {plan.attachment_no}
                      {(plan.source_pages ?? plan.source_pages_hint)?.length
                        ? ` · str. ${(plan.source_pages ?? plan.source_pages_hint)!.join(', ')}`
                        : ''}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-ink">{plan.school_type}</span>
                    <span className="text-ink-faint">·</span>
                    <span className="text-ink-soft">{plan.cycle}</span>
                    {plan.scope && (
                      <>
                        <span className="text-ink-faint">·</span>
                        <span className="text-ink-faint">{plan.scope}</span>
                      </>
                    )}
                    <span className="text-ink-faint text-xs">
                      Zał. nr {plan.attachment_no}
                      {(plan.source_pages ?? plan.source_pages_hint)?.length
                        ? ` · str. ${(plan.source_pages ?? plan.source_pages_hint)!.join(', ')}`
                        : ''}
                    </span>
                  </>
                )}
              </div>
              {unit && (
                <p className="text-xs text-ink-faint mt-1">Jednostka: {unit}</p>
              )}
            </div>

            <div className="overflow-x-auto w-full -mx-2 sm:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              <p className="sr-only">Przewiń tabelę w lewo/prawo na małym ekranie</p>
              <p className="sm:hidden text-xs text-ink-faint px-2 pt-1 pb-0.5">← Przewiń w poziomie, aby zobaczyć wszystkie kolumny</p>
              <table className="w-full min-w-[480px] text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b-2 border-line-strong">
                    <th className="sticky top-0 z-20 bg-surface-2 px-2 sm:px-3 py-2.5 sm:py-3 font-semibold text-ink-soft w-10 sm:w-12 border-r border-line text-left">
                      Lp.
                    </th>
                    <th className="sticky top-0 left-0 z-30 bg-surface-2 px-2 sm:px-3 py-2.5 sm:py-3 font-semibold text-ink-soft min-w-[100px] sm:min-w-[120px] border-r border-line">
                      Przedmiot
                    </th>
                    {hasGrades &&
                      grades.map((g) => (
                        <th
                          key={g}
                          className="sticky top-0 z-20 bg-surface-2 px-1.5 sm:px-2 py-2.5 sm:py-3 font-semibold text-ink-soft text-center w-12 sm:w-14 border-r border-line"
                        >
                          {g}
                        </th>
                      ))}
                    <th className="sticky top-0 z-20 bg-surface-2 px-2 sm:px-3 py-2.5 sm:py-3 font-semibold text-ink-soft text-right min-w-20 sm:min-w-24 w-24 sm:w-28 border-l-2 border-line-strong">
                      Razem
                    </th>
                    <th className="sticky top-0 z-20 bg-surface-2 px-2 sm:px-3 py-2.5 sm:py-3 font-semibold text-ink-soft text-right w-20 sm:w-24 border-l border-line whitespace-nowrap">
                      Zrealizowane godziny
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orderedSubjectsForTable.map((entry, i) => {
                    if (isDirectorRow(entry)) {
                      const tot = entry.director_discretion_hours.total_hours;
                      const dyrTon = klasaId && tot > 0 ? statusRealizacji(assignedDirectorHoursPlan, tot).ton : null;
                      return (
                        <tr key={i} className="border-t-2 border-line-strong font-medium bg-surface-2">
                          <td
                            className="sticky left-0 z-10 bg-surface-2 px-2 sm:px-3 py-1.5 sm:py-2 text-ink-soft border-r border-line text-sm"
                            colSpan={hasGrades ? 2 + grades.length : 2}
                          >
                            Godziny do dyspozycji dyrektora
                            {!tylkoOdczyt && klasaId && tot > 0 && (
                              <span className="block text-xs font-normal text-ink-faint mt-0.5">
                                Można je dodać do dowolnego przedmiotu (przyciski „Dyr. +” / „Dyr. −” w komórkach)
                              </span>
                            )}
                          </td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right tabular-nums text-ink border-l-2 border-line-strong border-r border-line min-w-20 sm:min-w-24 w-24 sm:w-28">
                            {tot}
                          </td>
                          <td
                            className={`px-2 sm:px-3 py-1.5 sm:py-2 text-right border-l border-line text-xs sm:text-sm ${
                              dyrTon ? TON_KOMORKA[dyrTon] : ''
                            }`}
                          >
                            {klasaId && tot > 0 ? (
                              <span className="tabular-nums">
                                {assignedDirectorHoursPlan} z {tot}
                                {directorHoursRemainingRaw > 0 && (
                                  <span className="block text-xs opacity-90 mt-0.5">{remainingDirectorHours} do przydziału</span>
                                )}
                              </span>
                            ) : (
                              PUSTA
                            )}
                          </td>
                        </tr>
                      );
                    }

                    const row = entry as SubjectRow;
                    const subject = row.subject ?? '–';
                    if (isPrzedmiotLaczny(subject)) return null;
                    const subKey = subjectKey(plan.plan_id, subject);
                    const hoursToChoose = row.hours_to_choose ?? 0;
                    /** Przy podziale na grupy używamy MAX (nie suma) – podwójne liczenie tylko w dyspozycji nauczycieli, nie w przydziale/nadwyżkach. */
                    const assignedByGrade = klasaId
                      ? (() => {
                          const fromPrzydzial = przydzial[subKey] ?? {};
                          const byGrade: Record<string, number> = {};
                          for (const g of grades) {
                            if (groupSplit.isSplit(subKey, g)) {
                              const gr = groupSplit.getGroupHours(subKey, g);
                              byGrade[g] = Math.max(gr[1] ?? 0, gr[2] ?? 0);
                            } else {
                              byGrade[g] = fromPrzydzial[g] ?? 0;
                            }
                          }
                          return byGrade;
                        })()
                      : {};
                    const directorByGrade = klasaId
                      ? (() => {
                          const fromDyrektor = dyrektor[subKey] ?? {};
                          const byGrade: Record<string, number> = {};
                          for (const g of grades) {
                            if (groupSplit.isSplit(subKey, g)) {
                              const gr = przydzialGrupyDyrektor[subKey]?.[g];
                              byGrade[g] = gr ? Math.max(gr[1] ?? 0, gr[2] ?? 0) : (fromDyrektor[g] ?? 0);
                            } else {
                              byGrade[g] = fromDyrektor[g] ?? 0;
                            }
                          }
                          return byGrade;
                        })()
                      : {};
                    const assignedSum = Object.values(assignedByGrade).reduce((a, b) => a + b, 0);
                    /** Limitu hours_to_choose dyrektorskie NIE wypełniają – można przydzielić pełne 4h mimo dyrektorskich. */
                    const remaining = hoursToChoose - assignedSum;
                    const czyRozszerzony = isPrzedmiotRozszerzony(subject);
                    const obramowanieRozszerzony = czyRozszerzony ? 'border-t-2 border-b-2 border-line-strong' : '';
                    const nazwaPogrubiona = rozszerzeniaSubKeys.has(subKey);
                    const godzinyRozszerzenia = nazwaPogrubiona ? extendedPoolSize : 0;
                    const canAssign = klasaId && hoursToChoose > 0 && remaining > 0;
                    /** Klikalne w trybie „Przydziel godzinę” także gdy programowe się skończyły (modal ponadprogramowe). W trybie „Przydziel godziny rozszerzeń” tylko przedmioty rozszerzone, gdy łączna pula ma wolne godziny. */
                    const canAssignOrPonadprogramowe =
                      klasaId && (hoursToChoose > 0 || (nazwaPogrubiona && extendedPoolAssignedTotal < extendedPoolSize));
                    /** Klikalne w trybie „Godz. dyrektorskie” także po wyczerpaniu puli — wtedy modal przed godziną ponadprogramową */
                    const canAddDirectorOrPonadprogramowe = klasaId && totalDirectorHours > 0;
                    const maPonadprogramowe = assignedSum > hoursToChoose;
                    const maNadgodzinyDyrektorskie = totalDirectorHours > 0 && assignedDirectorHoursPlan > totalDirectorHours;
                    /** Suma rzeczywista godzin w wierszu (baza + do wyboru + dyrektorskie + rozszerzenia) – aktualizuje się przy dodawaniu. W wierszu „przedmioty o zakresie rozszerzonym” baza = 0 (tylko przypisane z puli). */
                    const extendedByGradeForSubj = nazwaPogrubiona
                      ? (() => {
                          const byGrade: Record<string, number> = {};
                          for (const g of grades) {
                            const flatR = (rozszerzeniaPrzydzial[subKey] ?? {})[g] ?? 0;
                            if (groupSplit.isSplit(subKey, g)) {
                              const gr = przydzialGrupyRozszerzenia[subKey]?.[g];
                              const sumGr = gr ? (gr[1] ?? 0) + (gr[2] ?? 0) : 0;
                              byGrade[g] = sumGr > 0 ? Math.max(gr![1] ?? 0, gr![2] ?? 0) : flatR;
                            } else {
                              byGrade[g] = flatR;
                            }
                          }
                          return byGrade;
                        })()
                      : {};
                    /** Godziny rozszerzenia tylko w tym przedmiocie (nie suma po całym planie) – do kolumny „Zrealizowane”. */
                    const extendedSumForThisSubject = nazwaPogrubiona
                      ? grades.reduce((s, g) => s + (extendedByGradeForSubj[g] ?? 0), 0)
                      : 0;
                    const razemRzeczywiste = hasGrades
                      ? grades.reduce(
                          (s, g) =>
                            s +
                            (czyRozszerzony ? 0 : ((row.hours_by_grade?.[g] ?? 0) as number)) +
                            (assignedByGrade[g] ?? 0) +
                            (directorByGrade[g] ?? 0) +
                            (czyRozszerzony ? (extendedAssignedByGrade[g] ?? 0) : (extendedByGradeForSubj[g] ?? 0)),
                          0
                        )
                      : 0;
                    const razemDyrektorskie = hasGrades
                      ? grades.reduce((s, g) => s + (directorByGrade[g] ?? 0), 0)
                      : 0;
                    /** Liczba planowych godzin z MEiN (Razem w planie). W wierszu „przedmioty o zakresie rozszerzonym” = pula (np. 8), nie dodajemy base. */
                    const planoweGodziny = czyRozszerzony
                      ? (row.total_hours ?? 0)
                      : (row.total_hours ?? (hasGrades ? grades.reduce((s, g) => s + ((row.hours_by_grade?.[g] ?? 0) as number), 0) : 0));

                    const kafelekNazwaKlikalny = trybDodajRozszerzenia && !tylkoOdczyt && !czyRozszerzony;
                    /** Kolumna „Zrealizowane”: realizacja = suma godzin w wierszu (baza + do wyboru + dyrektor + rozszerzenia), plan = planoweGodziny z MEiN. */
                    const displayedAssigned = razemRzeczywiste;
                    const displayedTotal = planoweGodziny;
                    /** Podpis „do przydziału” tylko dla puli „godzin do wyboru”. */
                    const remainingOptionalForLabel = hoursToChoose > 0 ? Math.max(0, hoursToChoose - assignedSum) : 0;
                    /** Wolna pula rozszerzeń dla przedmiotu z etykietą rozszerzenie. */
                    const extensionPoolRemaining =
                      nazwaPogrubiona ? Math.max(0, extendedPoolSize - extendedPoolAssignedTotal) : 0;
                    const rowHasPodzial = groupSplit.rowHasAnySplit(subKey, grades);

                    const cellTallClass = 'py-2.5 sm:py-3 min-h-13';
                    const onToggleNazwa = () => {
                      const next = new Set(rozszerzeniaSubKeys);
                      if (next.has(subKey)) {
                        next.delete(subKey);
                        const nextPrzydzial = { ...rozszerzeniaPrzydzial };
                        delete nextPrzydzial[subKey];
                        setRozszerzeniaPrzydzial(nextPrzydzial);
                        setRozszerzeniaSubKeys(next);
                        setExtendedCellsAdded((prev) => {
                          const nextSet = new Set(prev);
                          grades.forEach((g) => nextSet.delete(`${subKey}_${g}`));
                          return nextSet;
                        });
                        const nextSet = new Set(next);
                        const nextGrupyRozsz = Object.fromEntries(
                          Object.entries(przydzialGrupyRozszerzenia).filter(([k]) => nextSet.has(k))
                        ) as Record<string, PrzydzialGrupyByGrade>;
                        if (Object.keys(nextGrupyRozsz).length !== Object.keys(przydzialGrupyRozszerzenia).length) {
                          setPrzydzialGrupyRozszerzenia(nextGrupyRozsz);
                        }
                        zapiszRozszerzeniaDoBazy(Array.from(next), nextPrzydzial, nextGrupyRozsz);
                      } else {
                        next.add(subKey);
                        setRozszerzeniaSubKeys(next);
                        zapiszRozszerzeniaDoBazy(Array.from(next));
                      }
                    };
                    return (
                      <Fragment key={i}>
                        <tr className={czyRozszerzony ? 'bg-surface-2' : ''}>
                            <td className={`px-2 sm:px-3 ${cellTallClass} text-ink-faint tabular-nums text-right border-r border-line w-10 sm:w-12 align-top ${obramowanieRozszerzony} ${czyRozszerzony ? 'border-l-2 border-l-line-strong' : ''}`}>
                              {czyRozszerzony ? <ZnacznikTyp>roz.</ZnacznikTyp> : row.lp != null ? row.lp : PUSTA}
                            </td>
                            <td
                              {...(kafelekNazwaKlikalny ? { ...komorkaKlawiatura(onToggleNazwa), 'aria-label': `Oznacz jako rozszerzenie: ${subject}` } : {})}
                              className={`sticky left-0 z-10 px-2 sm:px-3 ${cellTallClass} border-r border-line min-w-[100px] sm:min-w-0 align-top ${obramowanieRozszerzony} ${nazwaPogrubiona ? 'font-semibold text-ink' : 'text-ink'} ${kafelekNazwaKlikalny ? `cursor-pointer bg-accent-weak hover:bg-accent-weak/70 ring-1 ring-accent/30 rounded-sm ${FOCUS_KOMORKA}` : czyRozszerzony ? 'bg-surface-2' : 'bg-surface'}`}
                        >
                          <span>{subject}</span>
                          {nazwaPogrubiona && (
                            <span className="ml-1.5 inline-block px-1.5 py-0.5 text-xs font-normal text-accent-strong bg-accent-weak border border-accent/30 rounded-sm">rozszerzenie</span>
                          )}
                        </td>
                        {hasGrades &&
                          grades.map((g) => {
                            const base = (row.hours_by_grade?.[g] ?? 0) as number;
                            /** W wierszu „przedmioty o zakresie rozszerzonym”: assigned = suma godzin rozszerzeń w tym roczniku (bez osobnego limitu na rocznik — tylko pula łączna) */
                            const assigned = czyRozszerzony
                              ? (extendedAssignedByGrade[g] ?? 0)
                              : (assignedByGrade[g] ?? 0);
                            const dirH = directorByGrade[g] ?? 0;
                            const total = base + assigned + dirH;
                            /** W kafelku przedmiotu rozszerzonego (nazwaPogrubiona) pokazujemy też godziny z puli rozszerzeń w tym roczniku */
                            const cellDisplayTotal = nazwaPogrubiona && !czyRozszerzony
                              ? base + assigned + (extendedByGradeForSubj[g] ?? 0) + dirH
                              : total;
                            const canAssignThis =
                              canAssign && canPrzydzielacWKomorce(plan.school_type ?? '', g, subject);
                            const canAssignOrPonadprogramoweThis =
                              canAssignOrPonadprogramowe && canPrzydzielacWKomorce(plan.school_type ?? '', g, subject);
                            const canAddDirectorOrPonadprogramoweThis = canAddDirectorOrPonadprogramowe && canPrzydzielacWKomorce(plan.school_type ?? '', g, subject, true) && !czyRozszerzony;
                            /** W trybie „Przydziel godziny rozszerzeń”: można dodać, dopóki nie wyczerpano puli łącznej (bez limitu na pojedynczy rocznik). */
                            const klikalneRozszerzeniaThis =
                              trybPrzydzielGodzinyRozszerzen &&
                              nazwaPogrubiona &&
                              extendedPoolAssignedTotal < extendedPoolSize &&
                              canPrzydzielacWKomorce(plan.school_type ?? '', g, subject, true);
                            /** W trybie „Przydziel godzinę” zwykłe godziny tylko tam, gdzie przedmiot ma „godziny do wyboru” (np. fizyka, biologia); przedmiot bez nich (np. matematyka tylko rozszerzenie) – nie. */
                            const kafelekKlikalnyGodziny =
                              (trybPrzydzielGodzine && !trybPrzydzielGodzinyRozszerzen && canAssignOrPonadprogramoweThis && hoursToChoose > 0) ||
                              klikalneRozszerzeniaThis;
                            /** Komórka klikalna w trybie „Przydziel godzinę” (zwykłe godziny) – świeci obwódką/cieniem mimo innego tła */
                            const przydzielGodzineKlikalnyThis =
                              trybPrzydzielGodzine && !trybPrzydzielGodzinyRozszerzen && canAssignOrPonadprogramoweThis && hoursToChoose > 0;
                            const kafelekKlikalnyDyrektor = trybPrzydzielDyrektor && canAddDirectorOrPonadprogramoweThis;
                            const kafelekKlikalnyUsun = trybUsunGodzine && (dirH > 0 || assigned > 0 || (nazwaPogrubiona && (extendedByGradeForSubj[g] ?? 0) > 0) || (czyRozszerzony && (extendedAssignedByGrade[g] ?? 0) > 0));
                            const kafelekKlikalnyPodzial = trybPodzielNaGrupy && !tylkoOdczyt && !czyRozszerzony;
                            const kafelekKlikalny = kafelekKlikalnyPodzial || kafelekKlikalnyGodziny || kafelekKlikalnyDyrektor || kafelekKlikalnyUsun;
                            const podzialWlaczony = !czyRozszerzony && groupSplit.isSplit(subKey, g);
                            if (podzialWlaczony) {
                              const assignedG1Cell = groupSplit.getAssignedForGroup(subKey, g, 1);
                              const assignedG2Cell = groupSplit.getAssignedForGroup(subKey, g, 2);
                              const dirG1Cell = groupSplit.getDirectorForGroup(subKey, g, 1);
                              const dirG2Cell = groupSplit.getDirectorForGroup(subKey, g, 2);
                              const extG1Cell = groupSplit.getExtensionForGroup(subKey, g, 1);
                              const extG2Cell = groupSplit.getExtensionForGroup(subKey, g, 2);
                              const totalG1 = base + assignedG1Cell + dirG1Cell + extG1Cell;
                              const totalG2 = base + assignedG2Cell + dirG2Cell + extG2Cell;
                              const canAssignInCell = canPrzydzielacWKomorce(plan.school_type ?? '', g, subject);
                              const canAssignDirInCell = canPrzydzielacWKomorce(plan.school_type ?? '', g, subject, true) && !czyRozszerzony;

                              const isRegularAssignMode = trybPrzydzielGodzine && !trybPrzydzielGodzinyRozszerzen;
                              const isDirectorMode = trybPrzydzielDyrektor;
                              const isExtensionMode = trybPrzydzielGodzinyRozszerzen && nazwaPogrubiona;

                              let canG1 = false;
                              let canG2 = false;
                              let onAssG1: () => void = () => {};
                              let onAssG2: () => void = () => {};
                              let onRemG1: () => void = () => cofnijGodzine(subKey, g, 1);
                              let onRemG2: () => void = () => cofnijGodzine(subKey, g, 2);
                              let activeMode: 'none' | 'assign' | 'director' | 'extension' | 'delete' | 'split' = 'none';

                              if (trybUsunGodzine) {
                                activeMode = 'delete';
                                canG1 = totalG1 > 0;
                                canG2 = totalG2 > 0;
                                onRemG1 = () => {
                                  if (extG1Cell > 0) groupSplit.removeExtensionHourFromGroup(subKey, g, 1);
                                  else if (dirG1Cell > 0) groupSplit.removeDirectorHourFromGroup(subKey, g, 1);
                                  else groupSplit.removeHourFromGroup(subKey, g, 1);
                                };
                                onRemG2 = () => {
                                  if (extG2Cell > 0) groupSplit.removeExtensionHourFromGroup(subKey, g, 2);
                                  else if (dirG2Cell > 0) groupSplit.removeDirectorHourFromGroup(subKey, g, 2);
                                  else groupSplit.removeHourFromGroup(subKey, g, 2);
                                };
                              } else if (isDirectorMode && canAssignDirInCell) {
                                activeMode = 'director';
                                canG1 = !!(!!klasaId && canAddDirectorOrPonadprogramoweThis);
                                canG2 = !!(!!klasaId && canAddDirectorOrPonadprogramoweThis);
                                const addDir = () => {
                                  if (assignedDirectorHoursPlan >= totalDirectorHours) {
                                    setModalPonadprogramowa({
                                      kind: 'dyrektor',
                                      subKey,
                                      grade: g,
                                      subjectName: subject,
                                      splitBothGroups: true,
                                      totalDirectorHours,
                                      planId: plan.plan_id,
                                    });
                                  } else {
                                    groupSplit.addDirectorHourToBothGroups(subKey, g);
                                  }
                                };
                                onAssG1 = addDir;
                                onAssG2 = addDir;
                                onRemG1 = () => groupSplit.removeDirectorHourFromBothGroups(subKey, g);
                                onRemG2 = () => groupSplit.removeDirectorHourFromBothGroups(subKey, g);
                              } else if (isExtensionMode && canAssignInCell) {
                                activeMode = 'extension';
                                const canAddExt = extendedPoolAssignedTotal < extendedPoolSize;
                                canG1 = !!klasaId && canAddExt;
                                canG2 = !!klasaId && canAddExt;
                                const addExt = () => {
                                  groupSplit.addExtensionHourToBothGroups(subKey, g);
                                  setExtendedCellsAdded((prev) => new Set(prev).add(`${subKey}_${g}`));
                                };
                                onAssG1 = addExt;
                                onAssG2 = addExt;
                                onRemG1 = () => groupSplit.removeExtensionHourFromBothGroups(subKey, g);
                                onRemG2 = () => groupSplit.removeExtensionHourFromBothGroups(subKey, g);
                              } else if (isRegularAssignMode && canAssignOrPonadprogramoweThis && hoursToChoose > 0 && canAssignInCell) {
                                activeMode = 'assign';
                                const assignedG1Total = grades.reduce((s, gr) => {
                                  if (groupSplit.isSplit(subKey, gr)) return s + groupSplit.getAssignedForGroup(subKey, gr, 1);
                                  return s + ((przydzial[subKey] ?? {})[gr] ?? 0);
                                }, 0);
                                const assignedG2Total = grades.reduce((s, gr) => {
                                  if (groupSplit.isSplit(subKey, gr)) return s + groupSplit.getAssignedForGroup(subKey, gr, 2);
                                  return s + ((przydzial[subKey] ?? {})[gr] ?? 0);
                                }, 0);
                                const remainingG1Local = hoursToChoose - assignedG1Total;
                                const remainingG2Local = hoursToChoose - assignedG2Total;
                                canG1 = !!klasaId && remainingG1Local > 0;
                                canG2 = !!klasaId && remainingG2Local > 0;
                                onAssG1 = () => groupSplit.addHourToGroup(subKey, g, 1);
                                onAssG2 = () => groupSplit.addHourToGroup(subKey, g, 2);
                                onRemG1 = () => groupSplit.removeHourFromGroup(subKey, g, 1);
                                onRemG2 = () => groupSplit.removeHourFromGroup(subKey, g, 2);
                              } else if (trybPodzielNaGrupy && !tylkoOdczyt) {
                                activeMode = 'split';
                              }

                              const hasDirInCell = dirG1Cell > 0 || dirG2Cell > 0;
                              const hasExtInCell = extG1Cell > 0 || extG2Cell > 0;
                              return (
                                <GroupSplitCell
                                  key={g}
                                  grade={g}
                                  baseHours={base}
                                  optionalG1={assignedG1Cell}
                                  optionalG2={assignedG2Cell}
                                  directorG1={dirG1Cell}
                                  directorG2={dirG2Cell}
                                  extensionG1={extG1Cell}
                                  extensionG2={extG2Cell}
                                  totalG1={totalG1}
                                  totalG2={totalG2}
                                  remainingG1={activeMode === 'assign' ? (hoursToChoose - grades.reduce((s, gr) => s + (groupSplit.isSplit(subKey, gr) ? groupSplit.getAssignedForGroup(subKey, gr, 1) : ((przydzial[subKey] ?? {})[gr] ?? 0)), 0)) : remaining}
                                  remainingG2={activeMode === 'assign' ? (hoursToChoose - grades.reduce((s, gr) => s + (groupSplit.isSplit(subKey, gr) ? groupSplit.getAssignedForGroup(subKey, gr, 2) : ((przydzial[subKey] ?? {})[gr] ?? 0)), 0)) : remaining}
                                  klasaId={klasaId}
                                  canAssignG1={canG1}
                                  canAssignG2={canG2}
                                  canRemoveG1={activeMode === 'delete' && canG1}
                                  canRemoveG2={activeMode === 'delete' && canG2}
                                  canToggleSplit={kafelekKlikalnyPodzial}
                                  onAssignG1={onAssG1}
                                  onAssignG2={onAssG2}
                                  onRemoveG1={onRemG1}
                                  onRemoveG2={onRemG2}
                                  onToggleSplit={() => togglePodzialNaGrupy(subKey, g)}
                                  splitModeActive={trybPodzielNaGrupy && !tylkoOdczyt}
                                  isDeleteMode={trybUsunGodzine}
                                  activeMode={activeMode}
                                  hasDirectorHours={hasDirInCell}
                                  hasExtensionHours={hasExtInCell}
                                />
                              );
                            }
                            const maNadgodzinyDyrektorWKomorce = dirH > 0 && maNadgodzinyDyrektorskie;
                            const maGodzinyDyrektorskie = dirH > 0;
                            /** Tło komórki z przypisaną godziną: usuwanie → danger; rozszerzenia/ponad/nadgodziny → warn (uwaga: ponad limit). Typ rozróżnia znacznik tekstowy, nie sam kolor. */
                            const bgPonadprogramowa =
                              trybUsunGodzine
                                ? (assigned > 0 || dirH > 0 ? 'bg-danger-bg' : '')
                                : nazwaPogrubiona && (rozszerzeniaPrzydzial[subKey]?.[g] ?? 0) > 0 && !przydzielGodzineKlikalnyThis
                                  ? 'bg-accent-weak'
                                  : maPonadprogramowe && (assigned > 0 || dirH > 0)
                                    ? 'bg-warn-bg'
                                    : maNadgodzinyDyrektorWKomorce && dirH > 0
                                      ? 'bg-warn-bg'
                                      : '';
                            /** Tło dla komórek z godzinami dyrektorskimi. Nie stosuj gdy tryb przydziału/dyrektorski – wtedy bgKlikalny daje sygnał. */
                            const bgGodzinyDyrektorskie =
                              maGodzinyDyrektorskie && !maPonadprogramowe && !maNadgodzinyDyrektorWKomorce && !kafelekKlikalnyDyrektor && !kafelekKlikalnyGodziny
                                ? 'bg-surface-2 ring-1 ring-line-strong rounded-sm'
                                : '';
                            const bgKlikalny =
                              kafelekKlikalny
                                ? kafelekKlikalnyUsun
                                  ? maPonadprogramowe || maNadgodzinyDyrektorWKomorce
                                    ? `cursor-pointer hover:bg-danger-bg ring-2 ring-danger/50 rounded-sm ${FOCUS_KOMORKA}`
                                    : `cursor-pointer bg-danger-bg hover:bg-danger-bg ring-2 ring-danger/50 rounded-sm ${FOCUS_KOMORKA}`
                                  : kafelekKlikalnyDyrektor
                                    ? `cursor-pointer bg-accent-weak hover:bg-accent-weak/70 ring-2 ring-accent/50 rounded-sm ${FOCUS_KOMORKA}`
                                    : kafelekKlikalnyGodziny
                                      ? klikalneRozszerzeniaThis
                                        ? `cursor-pointer bg-accent-weak hover:bg-accent-weak/70 ring-2 ring-accent/50 rounded-sm ${FOCUS_KOMORKA}`
                                        : remaining > 0
                                          ? `cursor-pointer bg-ok-bg hover:bg-ok-bg ring-2 ring-ok/50 rounded-sm ${FOCUS_KOMORKA}`
                                          : `cursor-pointer bg-accent-weak hover:bg-accent-weak/70 ring-2 ring-accent/50 rounded-sm ${FOCUS_KOMORKA}`
                                      : ''
                                : '';
                            /** W trybie „Przydziel godzinę” dostępne pola świecą obwódką, żeby były widoczne mimo innego tła */
                            const swieciPrzydzielGodzine =
                              przydzielGodzineKlikalnyThis
                                ? 'ring-2 ring-ok ring-offset-1 ring-offset-surface'
                                : '';
                            /** Wiersz zbiorczy rozszerzeń: bez porównania do planu MEiN — tylko wskaźnik faktycznych godzin w roczniku */
                            const bgZrealizowaneRozszerzony =
                              czyRozszerzony && klasaId && !kafelekKlikalny && assigned > 0
                                ? 'bg-accent-weak ring-1 ring-accent/30 rounded-sm'
                                : '';
                            const textZrealizowaneRozszerzony =
                              czyRozszerzony && klasaId && !kafelekKlikalny && assigned > 0
                                ? 'text-accent-strong font-semibold'
                                : '';
                            /** Prawy przycisk usuwa tylko godziny (nie grupy) i tylko typu aktywnego przycisku. */
                            const maCoUsunacDyrektor = dirH > 0 && trybPrzydzielDyrektor;
                            const maCoUsunacRozszerzenia = (czyRozszerzony || nazwaPogrubiona) && (extendedAssignedByGrade[g] ?? 0) > 0 && trybPrzydzielGodzinyRozszerzen;
                            const maCoUsunacDoWyboru = assigned > 0 && trybPrzydzielGodzine && !trybPrzydzielGodzinyRozszerzen;
                            const maCoUsunacPrawym = maCoUsunacDyrektor || maCoUsunacRozszerzenia || maCoUsunacDoWyboru;
                            const onContextMenuUsun = maCoUsunacPrawym && !tylkoOdczyt
                              ? (e: ReactMouseEvent) => {
                                  e.preventDefault();
                                  if (maCoUsunacDyrektor) {
                                    usunGodzineDyrektorska(subKey, g);
                                  } else if (maCoUsunacRozszerzenia) {
                                    cofnijGodzineRozszerzen(g, planIdPrefix, nazwaPogrubiona ? subKey : undefined);
                                  } else if (maCoUsunacDoWyboru) {
                                    cofnijGodzine(subKey, g);
                                  }
                                }
                              : undefined;
                            const onClickKomorka = kafelekKlikalnyPodzial
                              ? () => togglePodzialNaGrupy(subKey, g)
                              : kafelekKlikalnyGodziny
                              ? () => {
                                  if (trybPrzydzielGodzinyRozszerzen && klikalneRozszerzeniaThis) {
                                    setExtendedCellsAdded((prev) => new Set(prev).add(`${subKey}_${g}`));
                                    dodajGodzineRozszerzen(subKey, g);
                                  } else if (remaining > 0) {
                                    przydzielGodzine(subKey, g);
                                  } else {
                                    setModalPonadprogramowa({ kind: 'optional', subKey, grade: g, subjectName: subject });
                                  }
                                }
                              : kafelekKlikalnyDyrektor
                                ? () => {
                                    if (assignedDirectorHoursPlan >= totalDirectorHours) {
                                      setModalPonadprogramowa({
                                        kind: 'dyrektor',
                                        subKey,
                                        grade: g,
                                        subjectName: subject,
                                        splitBothGroups: false,
                                        totalDirectorHours,
                                        planId: plan.plan_id,
                                      });
                                    } else {
                                      dodajGodzineDyrektorska(subKey, g, totalDirectorHours, plan.plan_id);
                                    }
                                  }
                                : kafelekKlikalnyUsun
                                  ? () => {
                                      if ((czyRozszerzony || nazwaPogrubiona) && (extendedAssignedByGrade[g] ?? 0) > 0) {
                                        cofnijGodzineRozszerzen(g, planIdPrefix, nazwaPogrubiona ? subKey : undefined);
                                      } else if (dirH > 0) usunGodzineDyrektorska(subKey, g);
                                      else cofnijGodzine(subKey, g);
                                    }
                                  : undefined;
                            return (
                              <td
                                key={g}
                                className={`px-1.5 sm:px-2 ${cellTallClass} text-center border-r border-line w-12 sm:w-14 align-top ${kafelekKlikalnyPodzial ? `cursor-pointer bg-warn-bg hover:bg-warn-bg ring-1 ring-warn/40 rounded-sm ${FOCUS_KOMORKA}` : ''} ${bgPonadprogramowa} ${bgGodzinyDyrektorskie} ${!kafelekKlikalnyPodzial ? bgKlikalny : ''} ${swieciPrzydzielGodzine} ${bgZrealizowaneRozszerzony} ${obramowanieRozszerzony}`}
                                onContextMenu={onContextMenuUsun}
                                onClick={onClickKomorka}
                                onKeyDown={
                                  kafelekKlikalny && onClickKomorka
                                    ? (e: ReactKeyboardEvent) => {
                                        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                                          e.preventDefault();
                                          onClickKomorka();
                                        }
                                      }
                                    : undefined
                                }
                                tabIndex={kafelekKlikalny ? 0 : undefined}
                                role={kafelekKlikalny ? 'button' : undefined}
                                title={
                                  kafelekKlikalnyPodzial
                                    ? groupSplit.isSplit(subKey, g) ? 'Kliknij, aby wyłączyć podział na grupy' : 'Kliknij, aby podzielić na grupy 1 i 2 (połowa | połowa)'
                                    : kafelekKlikalnyGodziny
                                    ? trybPrzydzielGodzinyRozszerzen && klikalneRozszerzeniaThis
                                      ? 'Kliknij, aby dodać 1 godzinę rozszerzeń (prawy przycisk: usuń)'
                                      : remaining > 0
                                        ? 'Kliknij, aby dodać 1 godzinę do wyboru (prawy przycisk: usuń)'
                                        : 'Kliknij, aby dodać godzinę ponadprogramową (po potwierdzeniu)'
                                    : kafelekKlikalnyDyrektor
                                      ? assignedDirectorHoursPlan >= totalDirectorHours
                                        ? 'Kliknij, aby dodać 1 godzinę dyrektorską ponadprogramową (ponad limit) — po potwierdzeniu'
                                        : `Kliknij, aby dodać 1 godzinę dyrektorską (zostało ${remainingDirectorHours}, prawy przycisk: usuń)`
                                      : kafelekKlikalnyUsun
                                        ? 'Kliknij, aby usunąć 1 godzinę (najpierw dyrektorską, potem do wyboru)'
                                        : maCoUsunacPrawym
                                          ? 'Prawy przycisk: usuń 1 godzinę (tylko typu aktywnego)'
                                        : maPonadprogramowe
                                          ? 'Godziny ponadprogramowe'
                                          : maNadgodzinyDyrektorWKomorce
                                            ? 'Nadgodziny dyrektorskie'
                                            : maGodzinyDyrektorskie
                                              ? 'Godziny dyrektorskie'
                                              : undefined
                                }
                              >
                                <span
                                  className={`tabular-nums ${
                                    textZrealizowaneRozszerzony
                                      ? textZrealizowaneRozszerzony
                                      : kafelekKlikalnyUsun
                                        ? 'font-bold text-danger'
                                        : kafelekKlikalnyDyrektor
                                          ? 'font-bold text-accent-strong'
                                          : kafelekKlikalnyGodziny
                                            ? klikalneRozszerzeniaThis
                                              ? 'font-bold text-accent-strong'
                                              : remaining > 0
                                                ? 'font-bold text-ok'
                                                : 'font-bold text-accent-strong'
                                            : maPonadprogramowe
                                              ? 'font-semibold text-warn'
                                              : maNadgodzinyDyrektorWKomorce
                                                ? 'font-semibold text-warn'
                                                : maGodzinyDyrektorskie
                                                  ? 'font-bold text-accent-strong'
                                                  : 'text-ink-soft'
                                  }`}
                                >
                                  {czyRozszerzony
                                    ? klasaId && assigned > 0
                                      ? (
                                          <>
                                            {assigned} z {assigned}
                                          </>
                                        )
                                      : PUSTA
                                    : cellDisplayTotal > 0
                                      ? dirH > 0
                                        ? <>{cellDisplayTotal - dirH}<ZnacznikTyp>+{dirH} dyr.</ZnacznikTyp></>
                                        : cellDisplayTotal
                                      : PUSTA}
                                </span>
                              </td>
                            );
                          })}
                        <td className={`${rowHasPodzial ? 'p-0 min-h-13' : `px-2 sm:px-3 ${cellTallClass} align-top`} text-right tabular-nums font-medium text-ink border-l-2 border-line-strong border-r border-line min-w-20 sm:min-w-24 w-24 sm:w-28 ${obramowanieRozszerzony}`}>
                          {rowHasPodzial ? (
                            <GroupSplitRazem
                              razemRzeczywiste={razemRzeczywiste}
                              razemDyrektorskie={razemDyrektorskie}
                              planoweGodziny={planoweGodziny}
                            />
                          ) : klasaId && hasGrades ? (
                            <>
                              <span className="tabular-nums">
                                {razemDyrektorskie > 0 ? (
                                  <>{razemRzeczywiste - razemDyrektorskie}<ZnacznikTyp>+{razemDyrektorskie} dyr.</ZnacznikTyp></>
                                ) : razemRzeczywiste}
                              </span>
                              {razemRzeczywiste !== planoweGodziny && (
                                <span className="block text-xs text-ink-faint mt-0.5 font-normal whitespace-nowrap">
                                  planowo {planoweGodziny}
                                </span>
                              )}
                            </>
                          ) : (
                            totalDisplay(row)
                          )}
                        </td>
                        <td
                          className={`${rowHasPodzial ? 'p-0 min-h-13' : `px-2 sm:px-3 ${cellTallClass} align-top`} text-right border-l border-line w-20 sm:w-24 text-xs sm:text-sm ${obramowanieRozszerzony} ${czyRozszerzony ? 'border-r-2 border-r-line-strong' : ''} ${
                            !rowHasPodzial &&
                            klasaId &&
                            (planoweGodziny > 0 || godzinyRozszerzenia > 0 || (row.hours_to_choose != null && row.hours_to_choose > 0) || czyRozszerzony) &&
                            planoweGodziny > 0
                              ? TON_KOMORKA[statusRealizacji(displayedAssigned, displayedTotal).ton]
                              : ''
                          }`}
                        >
                          {rowHasPodzial && (planoweGodziny > 0 || godzinyRozszerzenia > 0 || hoursToChoose > 0) ? (
                            <GroupSplitZrealizowane
                              assigned={displayedAssigned}
                              total={displayedTotal}
                              remaining={remainingOptionalForLabel}
                              extensionHoursForSubject={nazwaPogrubiona && extendedSumForThisSubject > 0 ? extendedSumForThisSubject : undefined}
                              directorHoursForSubject={razemDyrektorskie > 0 ? razemDyrektorskie : undefined}
                              extensionPoolRemaining={extensionPoolRemaining > 0 ? extensionPoolRemaining : undefined}
                            />
                          ) : rowHasPodzial ? (
                            <span className="text-ink-faint">{PUSTA}</span>
                          ) : planoweGodziny > 0 || godzinyRozszerzenia > 0 || row.hours_to_choose != null || czyRozszerzony ? (
                            klasaId ? (
                              <span className="tabular-nums">
                                {planoweGodziny > 0
                                  ? `${displayedAssigned} z ${displayedTotal}`
                                  : displayedAssigned > 0
                                    ? String(displayedAssigned)
                                    : PUSTA}
                                {extendedSumForThisSubject > 0 && (
                                  <span className="block text-xs opacity-90 mt-0.5">
                                    z czego {extendedSumForThisSubject} rozszerzeń
                                  </span>
                                )}
                                {razemDyrektorskie > 0 && (
                                  <span className="block text-xs opacity-90 mt-0.5">
                                    z czego {razemDyrektorskie} godzin dyrektorskich
                                  </span>
                                )}
                                {remainingOptionalForLabel > 0 && (
                                  <span className="block text-xs opacity-90 mt-0.5">
                                    {remainingOptionalForLabel} do przydziału (do wyboru)
                                  </span>
                                )}
                                {extensionPoolRemaining > 0 && (
                                  <span className="block text-xs opacity-90 mt-0.5">
                                    {extensionPoolRemaining} do przydziału z puli rozszerzeń
                                  </span>
                                )}
                              </span>
                            ) : (
                              row.hours_to_choose ?? PUSTA
                            )
                          ) : (
                            PUSTA
                          )}
                        </td>
                      </tr>
                    </Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-line-strong bg-surface-2 font-semibold text-xs sm:text-sm">
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 border-r border-line w-10 sm:w-12" />
                    <td className="sticky left-0 z-10 bg-surface-2 px-2 sm:px-3 py-1.5 sm:py-2 border-r border-line">
                      Suma godzin w roku
                    </td>
                    {hasGrades &&
                      grades.map((g) => {
                        const sum = sumByGrade[g] ?? 0;
                        const przydzielone = assignedSumByGrade[g] ?? 0;
                        const dyrektorG = directorSumByGrade[g] ?? 0;
                        const rozszerzeniaG = extendedAssignedByGrade[g] ?? 0;
                        const totalDodatkowe = totalGodzinyDoRozdysponowania + totalDirectorHours + extendedPoolSize;
                        const przydzieloneDodatkowe = przydzielone + dyrektorG + rozszerzeniaG;
                        const procent =
                          totalDodatkowe > 0
                            ? (przydzieloneDodatkowe / totalDodatkowe) * 100
                            : 0;
                        const titleParts = [`Razem ${sum} godz. w klasie ${g}`];
                        if (totalDodatkowe > 0) titleParts.push(`godz. dodatkowe: ${przydzieloneDodatkowe}/${totalDodatkowe} (${procent.toFixed(0)}%)`);
                        if (przydzielone > 0) titleParts.push(`w tym ${przydzielone} z puli do wyboru`);
                        if (dyrektorG > 0) titleParts.push(`${dyrektorG} godz. dyrektorskich`);
                        if (rozszerzeniaG > 0) titleParts.push(`${rozszerzeniaG} godz. rozszerzeń`);
                        return (
                          <td
                            key={g}
                            className={`px-1.5 sm:px-2 py-1.5 sm:py-2 text-center tabular-nums font-bold ring-1 ring-inset ${kolorOdProcentuGodzinDodatkowych(procent)}`}
                            title={titleParts.join('; ')}
                          >
                            {sum}
                          </td>
                        );
                      })}
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-ink-faint border-l-2 border-line-strong border-r border-line min-w-20 sm:min-w-24 w-24 sm:w-28">
                      {PUSTA}
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-ink-faint border-l border-line">
                      {PUSTA}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
  );
}
