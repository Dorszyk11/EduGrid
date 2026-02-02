'use client';

import { useState, useEffect, useCallback } from 'react';
import plansData from '@/utils/import/ramowe-plany.json';

const STORAGE_PREFIX = 'przydzial-wyboru-';
const STORAGE_DORADZTWO = 'zrealizowane-doradztwo-';
const STORAGE_DYREKTOR = 'dyrektor-godziny-';

type HoursByGrade = Record<string, number>;
type RawByGrade = Record<string, string>;

type SubjectRow = {
  lp?: number;
  subject?: string;
  hours_by_grade?: HoursByGrade;
  additional_by_grade?: HoursByGrade;
  total_hours?: number;
  additional_total?: number;
  raw?: RawByGrade;
  hours_to_choose?: number;
};

type DirectorRow = {
  director_discretion_hours: { total_hours: number };
};

type TableStructure = {
  grades?: string[];
  unit?: string;
};

export type PlanMein = {
  plan_id?: string;
  attachment_no: string;
  school_type: string;
  cycle: string;
  /** Krótka etykieta cyklu (np. "Klasy 1–3", "Klasy 4–8") – z JSON, dla czytelnego wyświetlania */
  cycle_short?: string;
  scope?: string;
  grades?: string[];
  table_structure?: TableStructure;
  source_pages?: number[];
  source_pages_hint?: number[];
  subjects: (SubjectRow | DirectorRow)[];
};

const data = plansData as { plans?: PlanMein[]; reference_plans?: PlanMein[] };
const allPlans: PlanMein[] = data.plans ?? data.reference_plans ?? [];

function isDirectorRow(r: SubjectRow | DirectorRow): r is DirectorRow {
  return 'director_discretion_hours' in r && !('subject' in r);
}

function getGrades(plan: PlanMein): string[] {
  return plan.table_structure?.grades ?? plan.grades ?? [];
}

function getUnit(plan: PlanMein): string | undefined {
  return plan.table_structure?.unit;
}

function cellDisplay(row: SubjectRow, grade: string, preferRaw: boolean): React.ReactNode {
  const raw = row.raw?.[grade];
  const val = row.hours_by_grade?.[grade];
  if (preferRaw && raw !== undefined && raw !== '') return raw;
  if (val !== undefined && val !== null) return String(val);
  return '–';
}

function totalDisplay(row: SubjectRow): React.ReactNode {
  const r = row.raw?.razem;
  const t = row.total_hours;
  if (r !== undefined && r !== '') return <span title="Wartość z tabeli">{r}</span>;
  if (t !== undefined && t !== null) return String(t);
  if (row.hours_to_choose != null) {
    return <span className="text-gray-500">min. {row.hours_to_choose}</span>;
  }
  return '–';
}

/** Dopasowanie nazwy typu szkoły do school_type z MEiN. Dokładna nazwa; wyjątek: „Szkoła podstawowa, klasy I–III” / „Szkoła podstawowa, klasy IV–VIII” dopasowują się do „Szkoła podstawowa”. */
function matchSchoolType(nazwaTypu: string, schoolType: string): boolean {
  const a = (nazwaTypu || '').trim().toLowerCase();
  const b = (schoolType || '').trim().toLowerCase();
  if (!a) return false;
  if (a === b) return true;
  if (b === 'szkoła podstawowa' && a.startsWith('szkoła podstawowa')) return true;
  return false;
}

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
  /** Wywoływane po każdej zmianie przydziału „godzin do wyboru” – np. do odświeżenia kafelków realizacji na dashboardzie */
  onPrzydzialChange?: () => void;
  /** Wywoływane po każdej zmianie zrealizowanych godzin doradztwa zawodowego */
  onDoradztwoChange?: () => void;
}

/** Z nazwy typu (np. "Szkoła podstawowa, klasy I–III") wyciąga filtr cyklu – żeby pokazać tylko jeden etap. */
function cycleFilterZNazwy(nazwaTypu: string): string | undefined {
  const n = (nazwaTypu || '').toLowerCase();
  if (n.includes('i–iii') || n.includes('i-iii') || n.includes('1–3') || n.includes('1-3')) return 'Klasy I–III';
  if (n.includes('iv–viii') || n.includes('iv-viii') || n.includes('4–8') || n.includes('4-8')) return 'Klasy IV–VIII';
  return undefined;
}

/** Klucz przydziału: plan + przedmiot (unikalny w obrębie widoku). */
function subjectKey(planId: string | undefined, subjectName: string): string {
  return `${planId ?? 'plan'}_${(subjectName || '').trim()}`;
}

/** W technikum w klasie V nie można dodawać geografii, biologii, fizyki i chemii. */
const PRZEDMIOTY_BLOKOWANE_V_TECHNIKUM = ['Geografia', 'Biologia', 'Fizyka', 'Chemia'];

/** Przedmioty w wymiarze łącznym (godziny w cyklu), nie tygodniowo – wyświetlane poniżej tabeli. */
const PRZEDMIOTY_LACZNE_CYKL: string[] = ['Zajęcia z zakresu doradztwa zawodowego'];

function isPrzedmiotLaczny(subjectName: string): boolean {
  return PRZEDMIOTY_LACZNE_CYKL.some((n) => (subjectName || '').trim() === n);
}

function canPrzydzielacWKomorce(schoolType: string, grade: string, subjectName: string): boolean {
  const st = (schoolType || '').trim().toLowerCase();
  if (st !== 'technikum') return true;
  if (grade !== 'V') return true;
  return !PRZEDMIOTY_BLOKOWANE_V_TECHNIKUM.includes((subjectName || '').trim());
}

/** Kolor komórki "Suma godzin w roku" wg % godzin dodatkowych (do wyboru + dyrektorskie) przydzielonych w tym roku. */
function kolorOdProcentuGodzinDodatkowych(procent: number): string {
  if (procent <= 25) return 'bg-emerald-100 text-emerald-800 ring-emerald-300';
  if (procent <= 35) return 'bg-amber-100 text-amber-800 ring-amber-300';
  if (procent <= 45) return 'bg-red-100 text-red-800 ring-red-300';
  if (procent <= 55) return 'bg-red-200 text-red-900 ring-red-400';
  return 'bg-red-400 text-red-950 ring-red-600 font-bold';
}

export default function PlanMeinTabela({ nazwaTypuSzkoly, cycleFilter, klasaId, tylkoOdczyt = false, refetchTrigger, trybPrzydzielGodzine = false, trybPrzydzielDyrektor = false, trybUsunGodzine = false, onPrzydzialChange, onDoradztwoChange }: PlanMeinTabelaProps) {
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
  /** Modal: czy dodać godzinę ponadprogramową (gdy programowe się skończyły) */
  const [modalPonadprogramowa, setModalPonadprogramowa] = useState<{
    subKey: string;
    grade: string;
    subjectName: string;
  } | null>(null);
  /** Modal: czy dodać godzinę dyrektorską ponad pulę (gdy pula się skończyła) */
  const [modalDyrektorPonadprogramowa, setModalDyrektorPonadprogramowa] = useState<{
    subKey: string;
    grade: string;
    subjectName: string;
  } | null>(null);

  useEffect(() => {
    if (!klasaId) {
      setPrzydzial({});
      setZrealizowaneDoradztwo({});
      setDyrektor({});
      return;
    }
    let cancelled = false;
    setLadowanieZapis(true);
    fetch(`/api/przydzial-godzin-wybor?klasaId=${encodeURIComponent(klasaId)}&_t=${refetchTrigger ?? 0}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('fetch failed'))))
      .then((data: { przydzial?: Record<string, Record<string, number>>; doradztwo?: Record<string, Record<string, number>>; dyrektor?: Record<string, Record<string, number>> }) => {
        if (cancelled) return;
        const p = data.przydzial && typeof data.przydzial === 'object' ? data.przydzial : {};
        const d = data.doradztwo && typeof data.doradztwo === 'object' ? data.doradztwo : {};
        const dy = data.dyrektor && typeof data.dyrektor === 'object' ? data.dyrektor : {};
        setPrzydzial(p);
        setZrealizowaneDoradztwo(d);
        setDyrektor(dy);
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_PREFIX + klasaId, JSON.stringify(p));
            localStorage.setItem(STORAGE_DORADZTWO + klasaId, JSON.stringify(d));
            localStorage.setItem(STORAGE_DYREKTOR + klasaId, JSON.stringify(dy));
          }
        } catch (_) {}
      })
      .catch(() => {
        if (cancelled) return;
        try {
          const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_PREFIX + klasaId) : null;
          if (raw) {
            const parsed = JSON.parse(raw) as Record<string, Record<string, number>>;
            setPrzydzial(parsed);
          } else {
            setPrzydzial({});
          }
        } catch {
          setPrzydzial({});
        }
        try {
          const rawD = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_DORADZTWO + klasaId) : null;
          if (rawD) {
            const parsed = JSON.parse(rawD) as Record<string, Record<string, number>>;
            setZrealizowaneDoradztwo(parsed);
          } else {
            setZrealizowaneDoradztwo({});
          }
        } catch {
          setZrealizowaneDoradztwo({});
        }
        try {
          const rawDy = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_DYREKTOR + klasaId) : null;
          if (rawDy) {
            const parsed = JSON.parse(rawDy) as Record<string, Record<string, number>>;
            setDyrektor(parsed);
          } else {
            setDyrektor({});
          }
        } catch {
          setDyrektor({});
        }
      })
      .finally(() => {
        if (!cancelled) setLadowanieZapis(false);
      });
    return () => {
      cancelled = true;
    };
  }, [klasaId, refetchTrigger]);

  const zapiszDoBazy = useCallback(
    (p: Record<string, Record<string, number>>, d: Record<string, Record<string, number>>, dy: Record<string, Record<string, number>>) => {
      if (!klasaId) return;
      fetch('/api/przydzial-godzin-wybor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ klasaId, przydzial: p, doradztwo: d, dyrektor: dy }),
      }).catch((err) => console.error('Zapis przydziału do bazy:', err));
    },
    [klasaId]
  );

  const zapiszPrzydzial = useCallback(
    (next: Record<string, Record<string, number>>) => {
      if (!klasaId) return;
      setPrzydzial(next);
      try {
        localStorage.setItem(STORAGE_PREFIX + klasaId, JSON.stringify(next));
      } catch (_) {}
      onPrzydzialChange?.();
      zapiszDoBazy(next, zrealizowaneDoradztwo, dyrektor);
    },
    [klasaId, onPrzydzialChange, zrealizowaneDoradztwo, dyrektor, zapiszDoBazy]
  );

  const przydzielGodzine = useCallback(
    (subKey: string, grade: string, _hoursToChoose?: number) => {
      const bySubject = przydzial[subKey] ?? {};
      const byGrade = (bySubject[grade] ?? 0) + 1;
      zapiszPrzydzial({
        ...przydzial,
        [subKey]: { ...bySubject, [grade]: byGrade },
      });
    },
    [przydzial, zapiszPrzydzial]
  );

  const cofnijGodzine = useCallback(
    (subKey: string, grade: string) => {
      const bySubject = przydzial[subKey] ?? {};
      const current = bySubject[grade] ?? 0;
      if (current <= 0) return;
      const next = current - 1;
      const nextBySubject = next === 0 ? { ...bySubject, [grade]: undefined } : { ...bySubject, [grade]: next };
      const cleaned = Object.fromEntries(Object.entries(nextBySubject).filter(([, v]) => v != null && v > 0)) as Record<string, number>;
      zapiszPrzydzial({ ...przydzial, [subKey]: cleaned });
    },
    [przydzial, zapiszPrzydzial]
  );

  const doradztwoKey = useCallback((planId: string | undefined, subject: string) => {
    return `${planId ?? 'plan'}_${(subject || '').trim()}`;
  }, []);

  const zapiszZrealizowaneDoradztwo = useCallback(
    (next: Record<string, Record<string, number>>) => {
      if (!klasaId) return;
      setZrealizowaneDoradztwo(next);
      try {
        localStorage.setItem(STORAGE_DORADZTWO + klasaId, JSON.stringify(next));
      } catch (_) {}
      onDoradztwoChange?.();
      zapiszDoBazy(przydzial, next, dyrektor);
    },
    [klasaId, onDoradztwoChange, przydzial, dyrektor, zapiszDoBazy]
  );

  const zapiszDyrektor = useCallback(
    (next: Record<string, Record<string, number>>) => {
      if (!klasaId) return;
      setDyrektor(next);
      try {
        localStorage.setItem(STORAGE_DYREKTOR + klasaId, JSON.stringify(next));
      } catch (_) {}
      onPrzydzialChange?.();
      zapiszDoBazy(przydzial, zrealizowaneDoradztwo, next);
    },
    [klasaId, onPrzydzialChange, przydzial, zrealizowaneDoradztwo, zapiszDoBazy]
  );

  const dodajZrealizowanaGodzine = useCallback(
    (key: string, grade: string, maxHours: number) => {
      const bySubject = zrealizowaneDoradztwo[key] ?? {};
      const suma = Object.values(bySubject).reduce((a, b) => a + b, 0);
      if (suma >= maxHours) return;
      const byGrade = (bySubject[grade] ?? 0) + 1;
      zapiszZrealizowaneDoradztwo({ ...zrealizowaneDoradztwo, [key]: { ...bySubject, [grade]: byGrade } });
    },
    [zrealizowaneDoradztwo, zapiszZrealizowaneDoradztwo]
  );

  const usunZrealizowanaGodzine = useCallback(
    (key: string, grade: string) => {
      const bySubject = zrealizowaneDoradztwo[key] ?? {};
      const current = bySubject[grade] ?? 0;
      if (current <= 0) return;
      const next = current - 1;
      const nextBySubject = next === 0 ? { ...bySubject, [grade]: undefined } : { ...bySubject, [grade]: next };
      const cleaned = Object.fromEntries(Object.entries(nextBySubject).filter(([, v]) => v != null && v > 0)) as Record<string, number>;
      zapiszZrealizowaneDoradztwo({ ...zrealizowaneDoradztwo, [key]: cleaned });
    },
    [zrealizowaneDoradztwo, zapiszZrealizowaneDoradztwo]
  );

  /** Suma przypisanych godzin dyrektorskich dla danego planu (klucze subKey zaczynają się od planId_) */
  const assignedDirectorForPlan = useCallback(
    (planId: string | undefined): number => {
      const prefix = (planId ?? 'plan') + '_';
      let sum = 0;
      for (const [key, byGrade] of Object.entries(dyrektor)) {
        if (!key.startsWith(prefix)) continue;
        for (const v of Object.values(byGrade)) sum += v;
      }
      return sum;
    },
    [dyrektor]
  );

  const dodajGodzineDyrektorska = useCallback(
    (subKey: string, grade: string, _totalDirectorHours?: number, _planId?: string | undefined) => {
      const bySubject = dyrektor[subKey] ?? {};
      const byGrade = (bySubject[grade] ?? 0) + 1;
      zapiszDyrektor({
        ...dyrektor,
        [subKey]: { ...bySubject, [grade]: byGrade },
      });
    },
    [dyrektor, zapiszDyrektor]
  );

  const usunGodzineDyrektorska = useCallback(
    (subKey: string, grade: string) => {
      const bySubject = dyrektor[subKey] ?? {};
      const current = bySubject[grade] ?? 0;
      if (current <= 0) return;
      const next = current - 1;
      const nextBySubject = next === 0 ? { ...bySubject, [grade]: undefined } : { ...bySubject, [grade]: next };
      const cleaned = Object.fromEntries(Object.entries(nextBySubject).filter(([, v]) => v != null && v > 0)) as Record<string, number>;
      zapiszDyrektor({ ...dyrektor, [subKey]: cleaned });
    },
    [dyrektor, zapiszDyrektor]
  );

  if (plans.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">
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
        <div className="rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3">
          <p className="font-semibold text-gray-800">{schoolTypeName}</p>
          <p className="text-sm text-gray-600 mt-0.5">
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
        const remainingDirectorHours = Math.max(0, totalDirectorHours - assignedDirectorHoursPlan);

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
          const assignedByGrade = klasaId ? (przydzial[subKey] ?? {}) : {};
          const directorByGrade = klasaId ? (dyrektor[subKey] ?? {}) : {};
          grades.forEach((g) => {
            const base = (row.hours_by_grade?.[g] ?? 0) as number;
            const assigned = assignedByGrade[g] ?? 0;
            const dirH = directorByGrade[g] ?? 0;
            sumByGrade[g] = (sumByGrade[g] ?? 0) + base + assigned + dirH;
            assignedSumByGrade[g] = (assignedSumByGrade[g] ?? 0) + assigned;
            directorSumByGrade[g] = (directorSumByGrade[g] ?? 0) + dirH;
          });
        });

        const przedmiotyLaczne = plan.subjects.filter(
          (entry): entry is SubjectRow =>
            !isDirectorRow(entry) && isPrzedmiotLaczny((entry as SubjectRow).subject ?? '')
        ) as SubjectRow[];

        return (
          <section
            key={plan.plan_id ?? `${plan.school_type}-${plan.cycle}-${idx}`}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm w-full min-w-0"
          >
            <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-gray-200">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-sm">
                {isPodstawowka ? (
                  <>
                    <span className="font-semibold text-gray-800">{cycleLabel}</span>
                    <span className="text-gray-400 text-xs">
                      Zał. nr {plan.attachment_no}
                      {(plan.source_pages ?? plan.source_pages_hint)?.length
                        ? ` · str. ${(plan.source_pages ?? plan.source_pages_hint)!.join(', ')}`
                        : ''}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-gray-800">{plan.school_type}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-600">{plan.cycle}</span>
                    {plan.scope && (
                      <>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-500">{plan.scope}</span>
                      </>
                    )}
                    <span className="text-gray-400 text-xs">
                      Zał. nr {plan.attachment_no}
                      {(plan.source_pages ?? plan.source_pages_hint)?.length
                        ? ` · str. ${(plan.source_pages ?? plan.source_pages_hint)!.join(', ')}`
                        : ''}
                    </span>
                  </>
                )}
              </div>
              {unit && (
                <p className="text-xs text-gray-500 mt-1">Jednostka: {unit}</p>
              )}
            </div>

            <div className="overflow-x-auto w-full -mx-2 sm:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              <p className="sr-only">Przewiń tabelę w lewo/prawo na małym ekranie</p>
              <p className="sm:hidden text-xs text-gray-500 px-2 pt-1 pb-0.5">← Przewiń w poziomie, aby zobaczyć wszystkie kolumny</p>
              <table className="w-full min-w-[480px] text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 font-semibold text-gray-700 w-10 sm:w-12 border-r border-gray-200 text-left">
                      Lp.
                    </th>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 font-semibold text-gray-700 min-w-[100px] sm:min-w-[120px] border-r border-gray-200">
                      Przedmiot
                    </th>
                    {hasGrades &&
                      grades.map((g) => (
                        <th
                          key={g}
                          className="px-1.5 sm:px-2 py-1.5 sm:py-2 font-semibold text-gray-700 text-center w-12 sm:w-14 border-r border-gray-200"
                        >
                          {g}
                        </th>
                      ))}
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 font-semibold text-gray-700 text-right w-12 sm:w-16">
                      Razem
                    </th>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 font-semibold text-gray-700 text-right w-20 sm:w-24 border-l border-gray-200 whitespace-nowrap">
                      Godz. do wyboru
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {plan.subjects.map((entry, i) => {
                    if (isDirectorRow(entry)) {
                      const tot = entry.director_discretion_hours.total_hours;
                      return (
                        <tr key={i} className="border-t-2 border-gray-300 font-medium bg-sky-50/50">
                          <td
                            className="px-2 sm:px-3 py-1.5 sm:py-2 text-gray-700 border-r border-gray-200 text-sm"
                            colSpan={hasGrades ? 2 + grades.length : 2}
                          >
                            Godziny do dyspozycji dyrektora
                            {!tylkoOdczyt && klasaId && tot > 0 && (
                              <span className="block text-xs font-normal text-gray-500 mt-0.5">
                                Można je dodać do dowolnego przedmiotu (przyciski „Dyr. +” / „Dyr. −” w komórkach)
                              </span>
                            )}
                          </td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right tabular-nums text-gray-800 border-r border-gray-100">
                            {tot}
                          </td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border-l border-gray-200 text-xs sm:text-sm">
                            {klasaId && tot > 0 ? (
                              <span className="tabular-nums text-gray-700">
                                {assignedDirectorHoursPlan} z {tot}
                                {remainingDirectorHours > 0 && (
                                  <span className="block text-gray-500 mt-0.5">{remainingDirectorHours} do przydziału</span>
                                )}
                              </span>
                            ) : (
                              '–'
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
                    const assignedByGrade = klasaId ? (przydzial[subKey] ?? {}) : {};
                    const directorByGrade = klasaId ? (dyrektor[subKey] ?? {}) : {};
                    const assignedSum = Object.values(assignedByGrade).reduce((a, b) => a + b, 0);
                    const remaining = hoursToChoose - assignedSum;
                    const canAssign = klasaId && hoursToChoose > 0 && remaining > 0;
                    /** Klikalne w trybie „Przydziel godzinę” także gdy programowe się skończyły (wtedy pokażemy modal ponadprogramowe) */
                    const canAssignOrPonadprogramowe = klasaId && hoursToChoose > 0;
                    const canAddDirector = klasaId && totalDirectorHours > 0 && remainingDirectorHours > 0;
                    /** Klikalne w trybie „Godz. dyrektorskie” także gdy pula się skończyła (wtedy modal ponad pulę) */
                    const canAddDirectorOrPonadprogramowe = klasaId && totalDirectorHours > 0;
                    const maPonadprogramowe = assignedSum > hoursToChoose;
                    const maNadgodzinyDyrektorskie = totalDirectorHours > 0 && assignedDirectorHoursPlan > totalDirectorHours;

                    return (
                      <tr
                        key={i}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-gray-500 tabular-nums border-r border-gray-100 w-10 sm:w-12">
                          {row.lp != null ? row.lp : '–'}
                        </td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-gray-800 border-r border-gray-100 min-w-[100px] sm:min-w-0">
                          {subject}
                        </td>
                        {hasGrades &&
                          grades.map((g) => {
                            const base = (row.hours_by_grade?.[g] ?? 0) as number;
                            const assigned = assignedByGrade[g] ?? 0;
                            const dirH = directorByGrade[g] ?? 0;
                            const total = base + assigned + dirH;
                            const canAssignThis =
                              canAssign && canPrzydzielacWKomorce(plan.school_type ?? '', g, subject);
                            const canAssignOrPonadprogramoweThis =
                              canAssignOrPonadprogramowe && canPrzydzielacWKomorce(plan.school_type ?? '', g, subject);
                            const canAddDirectorThis = canAddDirector && canPrzydzielacWKomorce(plan.school_type ?? '', g, subject);
                            const canAddDirectorOrPonadprogramoweThis = canAddDirectorOrPonadprogramowe && canPrzydzielacWKomorce(plan.school_type ?? '', g, subject);
                            const kafelekKlikalnyGodziny = trybPrzydzielGodzine && canAssignOrPonadprogramoweThis;
                            const kafelekKlikalnyDyrektor = trybPrzydzielDyrektor && canAddDirectorOrPonadprogramoweThis;
                            const kafelekKlikalnyUsun = trybUsunGodzine && (dirH > 0 || assigned > 0);
                            const kafelekKlikalny = kafelekKlikalnyGodziny || kafelekKlikalnyDyrektor || kafelekKlikalnyUsun;
                            const maNadgodzinyDyrektorWKomorce = dirH > 0 && maNadgodzinyDyrektorskie;
                            const bgPonadprogramowa =
                              maPonadprogramowe
                                ? trybUsunGodzine
                                  ? 'bg-red-200'
                                  : 'bg-blue-200'
                                : maNadgodzinyDyrektorWKomorce
                                  ? trybUsunGodzine
                                    ? 'bg-red-200'
                                    : 'bg-sky-200'
                                  : '';
                            const bgKlikalny =
                              kafelekKlikalny
                                ? kafelekKlikalnyUsun
                                  ? maPonadprogramowe || maNadgodzinyDyrektorWKomorce
                                    ? 'cursor-pointer hover:bg-red-300 ring-2 ring-red-400 rounded'
                                    : 'cursor-pointer bg-red-200 hover:bg-red-300 ring-2 ring-red-400 rounded'
                                  : kafelekKlikalnyDyrektor
                                    ? remainingDirectorHours > 0
                                      ? 'cursor-pointer bg-sky-200 hover:bg-sky-300 ring-2 ring-sky-400 rounded'
                                      : 'cursor-pointer bg-sky-200 hover:bg-sky-300 ring-2 ring-sky-400 rounded'
                                    : kafelekKlikalnyGodziny
                                      ? remaining > 0
                                        ? 'cursor-pointer bg-green-200 hover:bg-green-300 ring-2 ring-green-400 rounded'
                                        : 'cursor-pointer bg-blue-200 hover:bg-blue-300 ring-2 ring-blue-400 rounded'
                                      : ''
                                : '';
                            return (
                              <td
                                key={g}
                                className={`px-1.5 sm:px-2 py-1.5 sm:py-2 text-center border-r border-gray-100 w-12 sm:w-14 ${bgPonadprogramowa} ${bgKlikalny}`}
                                onClick={
                                  kafelekKlikalnyGodziny
                                    ? () => {
                                        if (remaining > 0) {
                                          przydzielGodzine(subKey, g);
                                        } else {
                                          setModalPonadprogramowa({ subKey, grade: g, subjectName: subject });
                                        }
                                      }
                                    : kafelekKlikalnyDyrektor
                                      ? () => {
                                          if (remainingDirectorHours > 0) {
                                            dodajGodzineDyrektorska(subKey, g, totalDirectorHours, plan.plan_id);
                                          } else {
                                            setModalDyrektorPonadprogramowa({ subKey, grade: g, subjectName: subject });
                                          }
                                        }
                                      : kafelekKlikalnyUsun
                                        ? () => {
                                            if (dirH > 0) usunGodzineDyrektorska(subKey, g);
                                            else cofnijGodzine(subKey, g);
                                          }
                                        : undefined
                                }
                                role={kafelekKlikalny ? 'button' : undefined}
                                title={
                                  kafelekKlikalnyGodziny
                                    ? remaining > 0
                                      ? 'Kliknij, aby dodać 1 godzinę do wyboru'
                                      : 'Kliknij, aby dodać godzinę ponadprogramową (po potwierdzeniu)'
                                    : kafelekKlikalnyDyrektor
                                      ? remainingDirectorHours > 0
                                        ? 'Kliknij, aby dodać 1 godzinę dyrektorską'
                                        : 'Kliknij, aby dodać godzinę dyrektorską ponad pulę (po potwierdzeniu)'
                                      : kafelekKlikalnyUsun
                                        ? 'Kliknij, aby usunąć 1 godzinę (najpierw dyrektorską, potem do wyboru)'
                                        : maPonadprogramowe
                                          ? 'Godziny ponadprogramowe'
                                          : maNadgodzinyDyrektorWKomorce
                                            ? 'Nadgodziny dyrektorskie'
                                            : undefined
                                }
                              >
                                <span
                                  className={`tabular-nums ${
                                    kafelekKlikalnyUsun
                                      ? 'font-bold text-red-700'
                                      : kafelekKlikalnyDyrektor
                                        ? 'font-bold text-sky-700'
                                        : kafelekKlikalnyGodziny
                                          ? remaining > 0
                                            ? 'font-bold text-green-700'
                                            : 'font-bold text-blue-700'
                                          : maPonadprogramowe
                                            ? 'font-semibold text-blue-800'
                                            : maNadgodzinyDyrektorWKomorce
                                              ? 'font-semibold text-sky-800'
                                              : 'text-gray-700'
                                  }`}
                                >
                                  {total > 0 ? total : '–'}
                                </span>
                              </td>
                            );
                          })}
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right tabular-nums font-medium text-gray-800 border-r border-gray-100">
                          {totalDisplay(row)}
                        </td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border-l border-gray-200 w-20 sm:w-24 text-xs sm:text-sm">
                          {row.hours_to_choose != null ? (
                            klasaId ? (
                              <span className="tabular-nums text-gray-700">
                                {assignedSum} z {row.hours_to_choose}
                                {remaining > 0 && (
                                  <span className="block text-xs text-gray-500 mt-0.5">
                                    {remaining} do przydziału
                                  </span>
                                )}
                              </span>
                            ) : (
                              row.hours_to_choose
                            )
                          ) : (
                            '–'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-400 bg-gray-50 font-semibold text-xs sm:text-sm">
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 border-r border-gray-200 w-10 sm:w-12" />
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 border-r border-gray-200">
                      Suma godzin w roku
                    </td>
                    {hasGrades &&
                      grades.map((g) => {
                        const sum = sumByGrade[g] ?? 0;
                        const przydzielone = assignedSumByGrade[g] ?? 0;
                        const dyrektorG = directorSumByGrade[g] ?? 0;
                        const totalDodatkowe = totalGodzinyDoRozdysponowania + totalDirectorHours;
                        const przydzieloneDodatkowe = przydzielone + dyrektorG;
                        const procent =
                          totalDodatkowe > 0
                            ? (przydzieloneDodatkowe / totalDodatkowe) * 100
                            : 0;
                        const titleParts = [`Razem ${sum} godz. w klasie ${g}`];
                        if (totalDodatkowe > 0) titleParts.push(`godz. dodatkowe: ${przydzieloneDodatkowe}/${totalDodatkowe} (${procent.toFixed(0)}%)`);
                        if (przydzielone > 0) titleParts.push(`w tym ${przydzielone} z puli do wyboru`);
                        if (dyrektorG > 0) titleParts.push(`${dyrektorG} godz. dyrektorskich`);
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
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-gray-500 border-r border-gray-200">
                      –
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-gray-500 border-l border-gray-200">
                      –
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {przedmiotyLaczne.length > 0 && hasGrades && (
              <div className="mx-2 sm:mx-4 mb-4 rounded-lg border border-gray-200 bg-gray-50/50 overflow-hidden shadow-sm">
                <div className="overflow-x-auto -mx-2 sm:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <table className="w-full min-w-[320px] text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-200 bg-gray-100">
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 text-xs min-w-[180px]">
                          Przedmiot
                        </th>
                        {grades.map((g) => (
                          <th key={g} className="px-2 py-2 text-center font-semibold text-gray-700 text-xs w-24 border-l border-gray-200">
                            {g}
                          </th>
                        ))}
                        <th className="px-4 py-2 text-center font-semibold text-gray-700 text-xs w-28 border-l-2 border-gray-300">
                          Zrealizowano
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {przedmiotyLaczne.map((row, i) => {
                        const key = doradztwoKey(plan.plan_id, row.subject ?? '');
                        const totalHours = row.total_hours ?? 0;
                        const byGrade = klasaId ? (zrealizowaneDoradztwo[key] ?? {}) : {};
                        const suma = Object.values(byGrade).reduce((a, b) => a + b, 0);
                        const canDodajOgolem = !!klasaId && suma < totalHours;
                        return (
                          <tr key={i} className="border-b border-gray-200 last:border-0 bg-white hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-2 font-medium text-gray-800">{row.subject ?? '–'}</td>
                            {grades.map((g) => {
                              const val = byGrade[g] ?? 0;
                              const canDodaj = canDodajOgolem;
                              const canUsun = !!klasaId && val > 0;
                              return (
                                <td key={g} className="px-2 py-2 text-center border-l border-gray-100 align-top">
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="tabular-nums font-medium text-gray-800">{val > 0 ? val : '–'}</span>
                                    {!tylkoOdczyt && klasaId && (
                                      <span className="inline-flex items-center gap-1 flex-wrap justify-center">
                                        <button
                                          type="button"
                                          onClick={() => canDodaj && dodajZrealizowanaGodzine(key, g, totalHours)}
                                          disabled={!canDodaj}
                                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${
                                            canDodaj ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100' : 'cursor-not-allowed bg-gray-100 text-gray-400 ring-gray-200'
                                          }`}
                                        >
                                          + Dodaj
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => canUsun && usunZrealizowanaGodzine(key, g)}
                                          disabled={!canUsun}
                                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${
                                            canUsun ? 'bg-red-50 text-red-700 ring-red-200 hover:bg-red-100' : 'cursor-not-allowed bg-gray-100 text-gray-400 ring-gray-200'
                                          }`}
                                        >
                                          − Usuń
                                        </button>
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                            <td className="px-4 py-2 text-center border-l-2 border-gray-200 align-middle">
                              <span className="tabular-nums font-bold text-gray-900">{suma}</span>
                              <span className="text-gray-500 font-normal"> z </span>
                              <span className="tabular-nums font-semibold text-gray-700">{totalHours}</span>
                              <span className="block text-xs text-gray-500 mt-0.5">godz. łącznie</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        );
      })}

      {/* Modal: czy dodać godzinę ponadprogramową */}
      {modalPonadprogramowa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Godziny ponadprogramowe</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Wszystkie godziny programowe są przydzielone. Czy chcesz dodać godzinę ponadprogramową do przedmiotu „{modalPonadprogramowa.subjectName}"?
            </p>
            <div className="flex flex-row gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalPonadprogramowa(null)}
                className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
              >
                Nie
              </button>
              <button
                type="button"
                onClick={() => {
                  przydzielGodzine(modalPonadprogramowa.subKey, modalPonadprogramowa.grade);
                  setModalPonadprogramowa(null);
                }}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Tak, dodaj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: czy dodać godzinę dyrektorską ponad pulę */}
      {modalDyrektorPonadprogramowa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Nadgodziny dyrektorskie</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Wszystkie godziny dyrektorskie są przydzielone. Czy chcesz dodać godzinę dyrektorską ponad pulę do przedmiotu „{modalDyrektorPonadprogramowa.subjectName}"?
            </p>
            <div className="flex flex-row gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalDyrektorPonadprogramowa(null)}
                className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
              >
                Nie
              </button>
              <button
                type="button"
                onClick={() => {
                  dodajGodzineDyrektorska(modalDyrektorPonadprogramowa.subKey, modalDyrektorPonadprogramowa.grade);
                  setModalDyrektorPonadprogramowa(null);
                }}
                className="px-4 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium"
              >
                Tak, dodaj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
