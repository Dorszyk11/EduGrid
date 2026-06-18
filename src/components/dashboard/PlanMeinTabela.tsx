'use client';

import { useState, useRef, Fragment } from 'react';
import plansData from '@/utils/import/ramowe-plany.json';
import { useGroupSplit, type GroupAssignments, type GroupSplitFlags, type GroupSplitSaveExtras } from '@/hooks/useGroupSplit';
import { useDaneKlasy, STORAGE_DYREKTOR } from '@/lib/hooks/useDaneKlasy';
import TabelaDoradztwa from './plan-mein/TabelaDoradztwa';
import TabelaPlanu from './plan-mein/TabelaPlanu';
import ModalPonadprogramowy, { type ModalPonadprogramowyState } from './plan-mein/ModalPonadprogramowy';
import type { SubjectRow, DirectorRow, PlanMein } from '@/lib/przydzial/typy';
import {
  isDirectorRow,
  getGrades,
  matchSchoolType,
  isPrzedmiotLaczny,
  isPrzedmiotRozszerzony,
  subjectKey,
} from '@/lib/przydzial/plany-mein';
import { getGodzinyRozszerzenia } from '@/lib/przydzial/reguly';
import {
  cacheSet,
  getUnit,
  cycleFilterZNazwy,
} from '@/lib/przydzial/tabelaHelpers';

export type { PlanMein };

const data = plansData as { plans?: PlanMein[]; reference_plans?: PlanMein[] };
const allPlans: PlanMein[] = data.plans ?? data.reference_plans ?? [];

export interface PlanMeinTabelaProps {
  /** Nazwa typu szkoły z bazy (np. "Szkoła podstawowa", "Liceum ogólnokształcące") – wyświetlane są plany MEiN dla tego typu */
  nazwaTypuSzkoly: string;
  /** Opcjonalnie: pokazać tylko jeden cykl (np. "Klasy I–III"); jeśli brak – wszystkie cykle dla typu */
  cycleFilter?: string;
  /** ID klasy – gdy podane, każda klasa ma niezależny przydział „godzin do wyboru” i zrealizowane godziny doradztwa (np. klasa A 2 godz., klasa B 3 godz.) */
  klasaId?: string;
  /** Gdy true – tylko odczyt planu, bez przycisków dodawania/usuwania godzin (np. na dashboardzie) */
  tylkoOdczyt?: boolean;
  /** Gdy się zmieni – odświeża dane z API (np. po „Generuj przydział”) */
  refetchTrigger?: number;
  /** Tryb „Przydziel godzinę” – sterowany z góry strony (Przydział) */
  trybPrzydzielGodzine?: boolean;
  /** Tryb „Dodaj godziny dyrektorskie” – sterowany z góry strony */
  trybPrzydzielDyrektor?: boolean;
  /** Tryb „Usuń godziny” – sterowany z góry strony */
  trybUsunGodzine?: boolean;
  /** Tryb „Dodaj rozszerzenia” – klik w nazwę przedmiotu przełącza pogrubienie */
  trybDodajRozszerzenia?: boolean;
  /** Tryb „Przydziel godziny rozszerzeń” – jak „Przydziel godzinę”, ale tylko w przedmiotach oznaczonych jako rozszerzone (klik dodaje 1 h do puli) */
  trybPrzydzielGodzinyRozszerzen?: boolean;
  /** Tryb „Podziel na grupy (1 i 2)” – klik w komórkę przełącza podział na pół (wyświetlanie jako grupa 1 | grupa 2) */
  trybPodzielNaGrupy?: boolean;
  /** Wywoływane po każdej zmianie przydziału „godzin do wyboru” – np. do odświeżenia kafelków realizacji na dashboardzie */
  onPrzydzialChange?: () => void;
  /** Wywoływane po każdej zmianie zrealizowanych godzin doradztwa zawodowego */
  onDoradztwoChange?: () => void;
}

export default function PlanMeinTabela({ nazwaTypuSzkoly, cycleFilter, klasaId, tylkoOdczyt = false, refetchTrigger, trybPrzydzielGodzine = false, trybPrzydzielDyrektor = false, trybUsunGodzine = false, trybDodajRozszerzenia = false, trybPrzydzielGodzinyRozszerzen = false, trybPodzielNaGrupy = false, onPrzydzialChange, onDoradztwoChange }: PlanMeinTabelaProps) {
  const cycleFilterAuto = cycleFilter ?? cycleFilterZNazwy(nazwaTypuSzkoly);
  const plans = allPlans.filter(
    (p) =>
      matchSchoolType(nazwaTypuSzkoly, p.school_type) &&
      (!cycleFilterAuto || p.cycle === cycleFilterAuto)
  );

  const [przydzial, setPrzydzial] = useState<Record<string, Record<string, number>>>({});
  const [zrealizowaneDoradztwo, setZrealizowaneDoradztwo] = useState<Record<string, Record<string, number>>>({});
  const [dyrektor, setDyrektor] = useState<Record<string, Record<string, number>>>({});
  const [ladowanieZapis, setLadowanieZapis] = useState(false);
  /** Modal: godziny do wyboru ponad program lub godziny dyrektorskie ponad limit puli */
  const [modalPonadprogramowa, setModalPonadprogramowa] = useState<ModalPonadprogramowyState | null>(null);
  /** Klucze przedmiotów oznaczonych jako „rozszerzenie” (pogrubiona nazwa) – tryb „Dodaj rozszerzenia” */
  const [rozszerzeniaSubKeys, setRozszerzeniaSubKeys] = useState<Set<string>>(() => new Set());
  /** Godziny rozszerzeń per przedmiot (subKey -> rocznik -> liczba). Przy odznaczeniu przedmiotu jego godziny znikają z puli. */
  const [rozszerzeniaPrzydzial, setRozszerzeniaPrzydzial] = useState<Record<string, Record<string, number>>>({});
  /** Pula godzin rozszerzeń (suma po przedmiotach rozszerzonych) – używana gdy brak rozszerzeniaPrzydzial (legacy). */
  const [extendedPoolByGradeLegacy, setExtendedPoolByGradeLegacy] = useState<Record<string, number>>({});
  /** Komórki, w których dodano godzinę rozszerzenia w tej sesji – tylko one mają fioletowe tło (klucz: subKey_grade) */
  const [extendedCellsAdded, setExtendedCellsAdded] = useState<Set<string>>(() => new Set());

  const groupSaveRef = useRef<
    (
      p: Record<string, Record<string, number>>,
      g: GroupAssignments,
      pd: GroupSplitFlags,
      gd: GroupAssignments,
      gr: GroupAssignments,
      extras?: GroupSplitSaveExtras,
    ) => void
  >(() => {});
  const groupSplit = useGroupSplit({
    klasaId,
    przydzial,
    setPrzydzial,
    dyrektor,
    rozszerzeniaPrzydzial,
    onSave: (p, g, pd, gd, gr, extras) => groupSaveRef.current(p, g, pd, gd, gr, extras),
    onChange: onPrzydzialChange,
  });
  const { przydzialGrupy, przydzialGrupyDyrektor, przydzialGrupyRozszerzenia, setPrzydzialGrupyRozszerzenia } = groupSplit;


  const {
    zapiszDoBazy,
    zapiszRozszerzeniaDoBazy,
    przydzielGodzine,
    cofnijGodzine,
    doradztwoKey,
    dodajZrealizowanaGodzine,
    usunZrealizowanaGodzine,
    assignedDirectorForPlan,
    dodajGodzineDyrektorska,
    usunGodzineDyrektorska,
    dodajGodzineRozszerzen,
    cofnijGodzineRozszerzen,
  } = useDaneKlasy({
    klasaId,
    refetchTrigger,
    onPrzydzialChange,
    onDoradztwoChange,
    groupSplit,
    przydzial,
    setPrzydzial,
    zrealizowaneDoradztwo,
    setZrealizowaneDoradztwo,
    dyrektor,
    setDyrektor,
    rozszerzeniaSubKeys,
    setRozszerzeniaSubKeys,
    rozszerzeniaPrzydzial,
    setRozszerzeniaPrzydzial,
    setExtendedPoolByGradeLegacy,
    setExtendedCellsAdded,
    setLadowanieZapis,
  });

  groupSaveRef.current = (p, g, pd, gd, gr, extras) => {
    const nextDy = extras?.dyrektor ?? dyrektor;
    if (extras?.dyrektor !== undefined) {
      setDyrektor(extras.dyrektor);
      if (klasaId) cacheSet(STORAGE_DYREKTOR + klasaId, extras.dyrektor);
    }
    if (extras?.rozszerzeniaPrzydzial !== undefined) {
      setRozszerzeniaPrzydzial(extras.rozszerzeniaPrzydzial);
    }
    zapiszDoBazy(
      p,
      zrealizowaneDoradztwo,
      nextDy,
      extras?.rozszerzeniaPrzydzial !== undefined ? extras.rozszerzeniaPrzydzial : undefined,
      g,
      pd,
      gd,
      gr,
    );
  };

  const togglePodzialNaGrupy = groupSplit.toggleSplit;

  if (plans.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-card p-4 text-amber-800">
        <p className="font-medium">Brak planu ramowego MEiN dla typu „{nazwaTypuSzkoly}”.</p>
        <p className="text-sm mt-1">
          W pliku ramowe-plany.json dostępne są m.in.: Szkoła podstawowa, Liceum ogólnokształcące, Technikum, Branżowa szkoła I stopnia.
        </p>
      </div>
    );
  }

  const isPodstawowka =
    plans.length > 1 &&
    plans.every((p) => (p.school_type || '').toLowerCase() === 'szkoła podstawowa');
  const schoolTypeName = plans[0]?.school_type ?? nazwaTypuSzkoly;
  const etapyTekst =
    plans.length === 2 && plans[0]?.cycle_short && plans[1]?.cycle_short
      ? `${plans[0].cycle_short} i ${plans[1].cycle_short}`
      : 'Klasy I–III (1–3) i Klasy IV–VIII (4–8)';

  return (
    <div className="space-y-6 w-full">
      {isPodstawowka && (
        <div className="rounded-lg border border-line bg-surface-2 px-4 py-3">
          <p className="font-semibold text-ink">{schoolTypeName}</p>
          <p className="text-sm text-ink-soft mt-0.5">
            Podział na etapy: <strong>{etapyTekst}</strong>
          </p>
        </div>
      )}
      {plans.map((plan, idx) => {
        const grades = getGrades(plan);
        const unit = getUnit(plan);
        const hasGrades = grades.length > 0;
        const cycleLabel = plan.cycle_short ?? plan.cycle;

        const directorRowEntry = plan.subjects.find(isDirectorRow);
        const totalDirectorHours = directorRowEntry?.director_discretion_hours?.total_hours ?? 0;
        const assignedDirectorHoursPlan = totalDirectorHours > 0 ? assignedDirectorForPlan(plan.plan_id) : 0;
        const directorHoursRemainingRaw = totalDirectorHours - assignedDirectorHoursPlan;
        const remainingDirectorHours = Math.max(0, directorHoursRemainingRaw);

        const sumByGrade: Record<string, number> = {};
        const assignedSumByGrade: Record<string, number> = {};
        const directorSumByGrade: Record<string, number> = {};
        let totalGodzinyDoRozdysponowania = 0;
        grades.forEach((g) => {
          sumByGrade[g] = 0;
          assignedSumByGrade[g] = 0;
          directorSumByGrade[g] = 0;
        });
        plan.subjects.forEach((entry) => {
          if (isDirectorRow(entry)) return;
          const row = entry as SubjectRow;
          const subject = row.subject ?? '–';
          if (isPrzedmiotLaczny(subject)) return;
          totalGodzinyDoRozdysponowania += row.hours_to_choose ?? 0;
          const subKey = subjectKey(plan.plan_id, subject);
          const assignedFlat = klasaId ? (przydzial[subKey] ?? {}) : {};
          const directorFlat = klasaId ? (dyrektor[subKey] ?? {}) : {};
          grades.forEach((g) => {
            const base = (row.hours_by_grade?.[g] ?? 0) as number;
            let assigned: number;
            let dirH: number;
            if (klasaId && groupSplit.isSplit(subKey, g)) {
              const gr = przydzialGrupy[subKey]?.[g];
              assigned = gr ? Math.max(gr[1] ?? 0, gr[2] ?? 0) : (assignedFlat[g] ?? 0);
              const grDir = przydzialGrupyDyrektor[subKey]?.[g];
              dirH = grDir ? Math.max(grDir[1] ?? 0, grDir[2] ?? 0) : (directorFlat[g] ?? 0);
            } else {
              assigned = assignedFlat[g] ?? 0;
              dirH = directorFlat[g] ?? 0;
            }
            sumByGrade[g] = (sumByGrade[g] ?? 0) + base + assigned + dirH;
            assignedSumByGrade[g] = (assignedSumByGrade[g] ?? 0) + assigned;
            directorSumByGrade[g] = (directorSumByGrade[g] ?? 0) + dirH;
          });
        });

        const przedmiotyLaczne = plan.subjects.filter(
          (entry): entry is SubjectRow =>
            !isDirectorRow(entry) && isPrzedmiotLaczny((entry as SubjectRow).subject ?? '')
        ) as SubjectRow[];

        /** Kolejność w tabeli: najpierw przedmioty rozszerzone (Lp. "roz."), potem pozostałe, na końcu wiersz dyrektora */
        const directorEntry = plan.subjects.find(isDirectorRow);
        const subjectEntries = plan.subjects.filter(
          (e): e is SubjectRow =>
            !isDirectorRow(e) && !isPrzedmiotLaczny((e as SubjectRow).subject ?? '')
        );
        const rozszerzonyEntries = subjectEntries.filter((e) =>
          isPrzedmiotRozszerzony(e.subject ?? '')
        );
        const otherSubjectEntries = subjectEntries.filter(
          (e) => !isPrzedmiotRozszerzony(e.subject ?? '')
        );
        const orderedSubjectsForTable: (SubjectRow | DirectorRow)[] = [
          ...rozszerzonyEntries,
          ...otherSubjectEntries,
          ...(directorEntry ? [directorEntry] : []),
        ];

        /** Pula godzin rozszerzeń (łącznie) – z rozszerzeniaPrzydzial i przydzialGrupyRozszerzenia (dla podziału na grupy) */
        let extendedPoolAssignedTotal = 0;
        const extendedAssignedByGrade: Record<string, number> = {};
        grades.forEach((g) => { extendedAssignedByGrade[g] = 0; });
        const planIdPrefix = (plan.plan_id ?? 'plan') + '_';
        if (klasaId) {
          const hasRozsz = Object.keys(rozszerzeniaPrzydzial).length > 0;
          const hasGrupyRozsz = Object.keys(przydzialGrupyRozszerzenia).length > 0;
          if (hasRozsz || hasGrupyRozsz) {
            rozszerzeniaSubKeys.forEach((subKey) => {
              if (!subKey.startsWith(planIdPrefix)) return;
              grades.forEach((g) => {
                let v = 0;
                const flatR = (rozszerzeniaPrzydzial[subKey] ?? {})[g] ?? 0;
                if (groupSplit.isSplit(subKey, g)) {
                  const gr = przydzialGrupyRozszerzenia[subKey]?.[g];
                  const sumGr = gr ? (gr[1] ?? 0) + (gr[2] ?? 0) : 0;
                  v = sumGr > 0 ? Math.max(gr![1] ?? 0, gr![2] ?? 0) : flatR;
                } else if (hasRozsz) {
                  v = flatR;
                }
                extendedAssignedByGrade[g] = (extendedAssignedByGrade[g] ?? 0) + v;
                extendedPoolAssignedTotal += v;
              });
            });
          } else {
            grades.forEach((g) => {
              const v = extendedPoolByGradeLegacy[g] ?? 0;
              extendedAssignedByGrade[g] = v;
              extendedPoolAssignedTotal += v;
            });
          }
        }
        /** Godziny rozszerzeń wliczamy do sumy godzin w roku (sumByGrade) */
        grades.forEach((g) => {
          sumByGrade[g] = (sumByGrade[g] ?? 0) + (extendedAssignedByGrade[g] ?? 0);
        });
        /** Pula godzin rozszerzeń i limity na rok – z wiersza „przedmioty o zakresie rozszerzonym” w planie (np. liceum 22, technikum 8). */
        const firstRozszerzonyRow = rozszerzonyEntries[0] as SubjectRow | undefined;
        const extendedPoolSize = firstRozszerzonyRow?.total_hours != null ? (firstRozszerzonyRow.total_hours as number) : getGodzinyRozszerzenia(plan.school_type ?? '');

        return (
          <Fragment key={plan.plan_id ?? `${plan.school_type}-${plan.cycle}-${idx}`}>
          <TabelaPlanu
            plan={plan}
            idx={idx}
            grades={grades}
            unit={unit}
            hasGrades={hasGrades}
            cycleLabel={cycleLabel}
            isPodstawowka={isPodstawowka}
            totalDirectorHours={totalDirectorHours}
            assignedDirectorHoursPlan={assignedDirectorHoursPlan}
            directorHoursRemainingRaw={directorHoursRemainingRaw}
            remainingDirectorHours={remainingDirectorHours}
            sumByGrade={sumByGrade}
            assignedSumByGrade={assignedSumByGrade}
            directorSumByGrade={directorSumByGrade}
            totalGodzinyDoRozdysponowania={totalGodzinyDoRozdysponowania}
            orderedSubjectsForTable={orderedSubjectsForTable}
            extendedPoolAssignedTotal={extendedPoolAssignedTotal}
            extendedAssignedByGrade={extendedAssignedByGrade}
            planIdPrefix={planIdPrefix}
            extendedPoolSize={extendedPoolSize}
            przydzial={przydzial}
            dyrektor={dyrektor}
            rozszerzeniaPrzydzial={rozszerzeniaPrzydzial}
            rozszerzeniaSubKeys={rozszerzeniaSubKeys}
            przydzialGrupyDyrektor={przydzialGrupyDyrektor}
            przydzialGrupyRozszerzenia={przydzialGrupyRozszerzenia}
            klasaId={klasaId}
            tylkoOdczyt={tylkoOdczyt}
            trybPrzydzielGodzine={trybPrzydzielGodzine}
            trybPrzydzielDyrektor={trybPrzydzielDyrektor}
            trybUsunGodzine={trybUsunGodzine}
            trybDodajRozszerzenia={trybDodajRozszerzenia}
            trybPrzydzielGodzinyRozszerzen={trybPrzydzielGodzinyRozszerzen}
            trybPodzielNaGrupy={trybPodzielNaGrupy}
            groupSplit={groupSplit}
            setRozszerzeniaPrzydzial={setRozszerzeniaPrzydzial}
            setRozszerzeniaSubKeys={setRozszerzeniaSubKeys}
            setExtendedCellsAdded={setExtendedCellsAdded}
            setPrzydzialGrupyRozszerzenia={setPrzydzialGrupyRozszerzenia}
            setModalPonadprogramowa={setModalPonadprogramowa}
            zapiszRozszerzeniaDoBazy={zapiszRozszerzeniaDoBazy}
            przydzielGodzine={przydzielGodzine}
            cofnijGodzine={cofnijGodzine}
            dodajGodzineDyrektorska={dodajGodzineDyrektorska}
            usunGodzineDyrektorska={usunGodzineDyrektorska}
            dodajGodzineRozszerzen={dodajGodzineRozszerzen}
            cofnijGodzineRozszerzen={cofnijGodzineRozszerzen}
            togglePodzialNaGrupy={togglePodzialNaGrupy}
          />

            {przedmiotyLaczne.length > 0 && hasGrades && (
              <TabelaDoradztwa
                przedmiotyLaczne={przedmiotyLaczne}
                grades={grades}
                planId={plan.plan_id}
                idx={idx}
                cycleLabel={cycleLabel}
                klasaId={klasaId}
                zrealizowaneDoradztwo={zrealizowaneDoradztwo}
                tylkoOdczyt={tylkoOdczyt}
                doradztwoKey={doradztwoKey}
                dodajZrealizowanaGodzine={dodajZrealizowanaGodzine}
                usunZrealizowanaGodzine={usunZrealizowanaGodzine}
              />
            )}
          </Fragment>
        );
      })}

      {/* Modal: godziny ponadprogramowe (do wyboru lub dyrektorskie ponad pulę) */}
      {modalPonadprogramowa && (
        <ModalPonadprogramowy
          modal={modalPonadprogramowa}
          onClose={() => setModalPonadprogramowa(null)}
          onPotwierdz={(m) => {
            if (m.kind === 'optional') {
              przydzielGodzine(m.subKey, m.grade);
            } else if (m.splitBothGroups) {
              groupSplit.addDirectorHourToBothGroups(m.subKey, m.grade);
            } else {
              dodajGodzineDyrektorska(m.subKey, m.grade, m.totalDirectorHours, m.planId);
            }
          }}
        />
      )}

    </div>
  );
}
