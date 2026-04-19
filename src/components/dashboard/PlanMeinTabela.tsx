'use client';

import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import plansData from '@/utils/import/ramowe-plany.json';
import { useGroupSplit, type GroupAssignments, type GroupSplitFlags, type GroupSplitSaveExtras } from '@/hooks/useGroupSplit';
import GroupSplitCell from './GroupSplitCell';
import { GroupSplitRazem, GroupSplitZrealizowane } from './GroupSplitSummary';

const STORAGE_PREFIX = 'przydzial-wyboru-';
const STORAGE_DORADZTWO = 'zrealizowane-doradztwo-';
const STORAGE_DYREKTOR = 'dyrektor-godziny-';

type HoursByGrade = Record<string, number>;
/** Dla rocznika z podziałem na grupy: godziny grupy 1 i 2 osobno */
type PrzydzialGrupyByGrade = Record<string, { 1: number; 2: number }>;
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
  // Wiersz „przedmioty o zakresie rozszerzonym” – w kolumnie Razem domyślnie 0 (nie pokazujemy planowych 8/22)
  if (row.subject && isPrzedmiotRozszerzony(row.subject)) {
    if (r !== undefined && r !== '') return <span title="Wartość z tabeli">{r}</span>;
    return '0';
  }
  if (r !== undefined && r !== '') return <span title="Wartość z tabeli">{r}</span>;
  if (t !== undefined && t !== null) return String(t);
  if (row.hours_to_choose != null) {
    return <span className="text-gray-500">min. {row.hours_to_choose}</span>;
  }
  return '0';
}

/** Dopasowanie nazwy typu szkoły do school_type z MEiN. Nazwa z bazy może być np. "Technikum, Klasy I–V" – dopasowuje do planu school_type "Technikum". */
function matchSchoolType(nazwaTypu: string, schoolType: string): boolean {
  const a = (nazwaTypu || '').trim().toLowerCase();
  const b = (schoolType || '').trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.startsWith(b) && (a.length === b.length || a.charAt(b.length) === ',')) return true;
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

/** Z nazwy typu (np. "Technikum, Klasy I–V") wyciąga filtr cyklu – żeby pokazać tylko jeden etap. */
function cycleFilterZNazwy(nazwaTypu: string): string | undefined {
  const n = (nazwaTypu || '').toLowerCase();
  if (n.includes('i–iii') || n.includes('i-iii') || n.includes('1–3') || n.includes('1-3')) return 'Klasy I–III';
  if (n.includes('iv–viii') || n.includes('iv-viii') || n.includes('4–8') || n.includes('4-8')) return 'Klasy IV–VIII';
  if (n.includes('i–v') || n.includes('i-v') || n.includes('1–5') || n.includes('1-5')) return 'Klasy I–V';
  if (n.includes('i–iv') || n.includes('i-iv') || n.includes('1–4') || n.includes('1-4')) return 'Klasy I–IV';
  if (n.includes('vii–viii') || n.includes('vii-viii') || n.includes('7–8') || n.includes('7-8')) return 'Klasy VII–VIII';
  return undefined;
}

/** Klucz przydziału: plan + przedmiot (unikalny w obrębie widoku). */
function subjectKey(planId: string | undefined, subjectName: string): string {
  return `${planId ?? 'plan'}_${(subjectName || '').trim()}`;
}

/** W technikum w klasie V nie można dodawać zwykłych „godzin do wyboru” na geografię, biologię, fizykę i chemię. Godziny dyrektorskie i rozszerzone można. */
const PRZEDMIOTY_BLOKOWANE_V_TECHNIKUM = ['Geografia', 'Biologia', 'Fizyka', 'Chemia'];

/** Przedmioty w wymiarze łącznym (godziny w cyklu), nie tygodniowo – wyświetlane poniżej tabeli. */
const PRZEDMIOTY_LACZNE_CYKL: string[] = ['Zajęcia z zakresu doradztwa zawodowego'];

function isPrzedmiotLaczny(subjectName: string): boolean {
  return PRZEDMIOTY_LACZNE_CYKL.some((n) => (subjectName || '').trim() === n);
}

/** Przedmiot w zakresie rozszerzonym – przenosimy na górę tabeli z Lp. "roz." */
function isPrzedmiotRozszerzony(subjectName: string): boolean {
  return /w\s+zakresie\s+rozszerzonym|przedmioty\s+.*\s+rozszerz/i.test((subjectName || '').trim());
}

/** Godziny w zakresie rozszerzonym dodawane do „Zrealizowane godziny” (np. technikum 8). */
function getGodzinyRozszerzenia(schoolType: string): number {
  const st = (schoolType || '').trim().toLowerCase();
  if (st === 'technikum') return 8;
  if (st.includes('liceum')) return 8;
  return 0;
}

/** Czy można przydzielać w tej komórce. forDirectorOrExtended=true → godziny dyrektorskie/rozszerzone można też na V (geografia, biologia, chemia, fizyka). */
function canPrzydzielacWKomorce(schoolType: string, grade: string, subjectName: string, forDirectorOrExtended?: boolean): boolean {
  const st = (schoolType || '').trim().toLowerCase();
  if (st !== 'technikum') return true;
  if (grade !== 'V') return true;
  if (forDirectorOrExtended) return true;
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
  const [modalPonadprogramowa, setModalPonadprogramowa] = useState<
    | { kind: 'optional'; subKey: string; grade: string; subjectName: string }
    | {
        kind: 'dyrektor';
        subKey: string;
        grade: string;
        subjectName: string;
        splitBothGroups: boolean;
        totalDirectorHours: number;
        planId?: string;
      }
    | null
  >(null);
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
  const { podzialNaGrupy, przydzialGrupy, przydzialGrupyDyrektor, przydzialGrupyRozszerzenia, setPodzialNaGrupy, setPrzydzialGrupy, setPrzydzialGrupyDyrektor, setPrzydzialGrupyRozszerzenia } = groupSplit;

  useEffect(() => {
    if (!klasaId) {
      setPrzydzial({});
      setZrealizowaneDoradztwo({});
      setDyrektor({});
      setRozszerzeniaSubKeys(new Set());
      setRozszerzeniaPrzydzial({});
      setExtendedPoolByGradeLegacy({});
      setExtendedCellsAdded(new Set());
      return;
    }
    let cancelled = false;
    setLadowanieZapis(true);
    fetch(`/api/przydzial-godzin-wybor?klasaId=${encodeURIComponent(klasaId)}&_t=${refetchTrigger ?? 0}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('fetch failed'))))
      .then((data: { przydzial?: Record<string, Record<string, number>>; doradztwo?: Record<string, Record<string, number>>; dyrektor?: Record<string, Record<string, number>>; rozszerzenia?: string[]; rozszerzeniaGodziny?: Record<string, number>; rozszerzeniaPrzydzial?: Record<string, Record<string, number>>; podzialNaGrupy?: Record<string, Record<string, boolean>>; przydzialGrupy?: Record<string, Record<string, { 1: number; 2: number }>>; dyrektorGrupy?: Record<string, Record<string, { 1: number; 2: number }>>; rozszerzeniaGrupy?: Record<string, Record<string, { 1: number; 2: number }>> }) => {
        if (cancelled) return;
        const p = data.przydzial && typeof data.przydzial === 'object' ? data.przydzial : {};
        const d = data.doradztwo && typeof data.doradztwo === 'object' ? data.doradztwo : {};
        const dy = data.dyrektor && typeof data.dyrektor === 'object' ? data.dyrektor : {};
        const rozszerzeniaArr = Array.isArray(data.rozszerzenia) ? data.rozszerzenia : [];
        const rozszPrzydzial = data.rozszerzeniaPrzydzial && typeof data.rozszerzeniaPrzydzial === 'object' ? data.rozszerzeniaPrzydzial : {};
        const rozszGodz = data.rozszerzeniaGodziny && typeof data.rozszerzeniaGodziny === 'object' ? data.rozszerzeniaGodziny : {};
        const podzial = data.podzialNaGrupy && typeof data.podzialNaGrupy === 'object' ? data.podzialNaGrupy : {};
        const pg = data.przydzialGrupy && typeof data.przydzialGrupy === 'object' ? data.przydzialGrupy : {};
        const dgr = data.dyrektorGrupy && typeof data.dyrektorGrupy === 'object' ? data.dyrektorGrupy : {};
        const rgr = data.rozszerzeniaGrupy && typeof data.rozszerzeniaGrupy === 'object' ? data.rozszerzeniaGrupy : {};
        setPrzydzial(p);
        setZrealizowaneDoradztwo(d);
        setDyrektor(dy);
        setRozszerzeniaSubKeys(new Set(rozszerzeniaArr));
        setRozszerzeniaPrzydzial(rozszPrzydzial);
        setExtendedPoolByGradeLegacy(rozszGodz);
        setExtendedCellsAdded(new Set());
        setPodzialNaGrupy(podzial);
        setPrzydzialGrupy(pg);
        setPrzydzialGrupyDyrektor(dgr);
        setPrzydzialGrupyRozszerzenia(rgr);
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
    (p: Record<string, Record<string, number>>, d: Record<string, Record<string, number>>, dy: Record<string, Record<string, number>>, rozszPrzydzial?: Record<string, Record<string, number>>, pg?: Record<string, PrzydzialGrupyByGrade>, podzial?: Record<string, Record<string, boolean>>, dyrGrupy?: Record<string, PrzydzialGrupyByGrade>, rozszGrupy?: Record<string, PrzydzialGrupyByGrade>) => {
      if (!klasaId) return;
      const body: Record<string, unknown> = {
        klasaId,
        przydzial: p,
        doradztwo: d,
        dyrektor: dy,
      };
      if (rozszPrzydzial !== undefined) body.rozszerzeniaPrzydzial = rozszPrzydzial;
      if (pg !== undefined) body.przydzialGrupy = pg;
      if (podzial !== undefined) body.podzialNaGrupy = podzial;
      if (dyrGrupy !== undefined) body.dyrektorGrupy = dyrGrupy;
      if (rozszGrupy !== undefined) body.rozszerzeniaGrupy = rozszGrupy;
      fetch('/api/przydzial-godzin-wybor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch((err) => console.error('Zapis przydziału do bazy:', err));
    },
    [klasaId]
  );

  groupSaveRef.current = (p, g, pd, gd, gr, extras) => {
    const nextDy = extras?.dyrektor ?? dyrektor;
    if (extras?.dyrektor !== undefined) {
      setDyrektor(extras.dyrektor);
      try {
        if (klasaId) localStorage.setItem(STORAGE_DYREKTOR + klasaId, JSON.stringify(extras.dyrektor));
      } catch (_) {}
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

  /** Zapisuje listę rozszerzeń (i ewentualnie przydział godzin rozszerzeń po odznaczeniu przedmiotu) do bazy. */
  const zapiszRozszerzeniaDoBazy = useCallback(
    (rozszerzenia: string[], rozszPrzydzial?: Record<string, Record<string, number>>, rozszGrupy?: Record<string, PrzydzialGrupyByGrade>) => {
      if (!klasaId) return;
      const przydzialRozszerzen = rozszPrzydzial ?? rozszerzeniaPrzydzial;
      const body: Record<string, unknown> = {
        klasaId,
        przydzial,
        doradztwo: zrealizowaneDoradztwo,
        dyrektor,
        rozszerzenia,
        rozszerzeniaPrzydzial: przydzialRozszerzen,
      };
      if (rozszGrupy !== undefined) body.rozszerzeniaGrupy = rozszGrupy;
      fetch('/api/przydzial-godzin-wybor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch((err) => console.error('Zapis rozszerzeń do bazy:', err));
    },
    [klasaId, przydzial, zrealizowaneDoradztwo, dyrektor, rozszerzeniaPrzydzial]
  );

  const togglePodzialNaGrupy = groupSplit.toggleSplit;

  const zapiszPrzydzial = useCallback(
    (next: Record<string, Record<string, number>>) => {
      if (!klasaId) return;
      setPrzydzial(next);
      try {
        localStorage.setItem(STORAGE_PREFIX + klasaId, JSON.stringify(next));
      } catch (_) {}
      onPrzydzialChange?.();
      zapiszDoBazy(next, zrealizowaneDoradztwo, dyrektor, undefined, przydzialGrupy);
    },
    [klasaId, onPrzydzialChange, zrealizowaneDoradztwo, dyrektor, zapiszDoBazy, przydzialGrupy]
  );

  const przydzielGodzine = useCallback(
    (subKey: string, grade: string, _hoursToChoose?: number, group?: 1 | 2) => {
      if ((group === 1 || group === 2) && groupSplit.isSplit(subKey, grade)) {
        groupSplit.addHourToGroup(subKey, grade, group);
        return;
      }
      const bySubject = przydzial[subKey] ?? {};
      const byGrade = (bySubject[grade] ?? 0) + 1;
      zapiszPrzydzial({
        ...przydzial,
        [subKey]: { ...bySubject, [grade]: byGrade },
      });
    },
    [przydzial, groupSplit, zapiszPrzydzial]
  );

  const cofnijGodzine = useCallback(
    (subKey: string, grade: string, group?: 1 | 2) => {
      if ((group === 1 || group === 2) && groupSplit.isSplit(subKey, grade)) {
        groupSplit.removeHourFromGroup(subKey, grade, group);
        return;
      }
      const bySubject = przydzial[subKey] ?? {};
      const current = bySubject[grade] ?? 0;
      if (current <= 0) return;
      const next = current - 1;
      const nextBySubject = next === 0 ? { ...bySubject, [grade]: undefined } : { ...bySubject, [grade]: next };
      const cleaned = Object.fromEntries(Object.entries(nextBySubject).filter(([, v]) => v != null && v > 0)) as Record<string, number>;
      zapiszPrzydzial({ ...przydzial, [subKey]: cleaned });
    },
    [przydzial, groupSplit, zapiszPrzydzial]
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

  /** Suma przypisanych godzin dyrektorskich dla danego planu (dyrektor + przydzialGrupyDyrektor dla podziału) */
  const assignedDirectorForPlan = useCallback(
    (planId: string | undefined): number => {
      const prefix = (planId ?? 'plan') + '_';
      let sum = 0;
      for (const [key, byGrade] of Object.entries(dyrektor)) {
        if (!key.startsWith(prefix)) continue;
        for (const v of Object.values(byGrade)) sum += v;
      }
      for (const [key, byGrade] of Object.entries(przydzialGrupyDyrektor)) {
        if (!key.startsWith(prefix)) continue;
        for (const gr of Object.values(byGrade)) {
          if (gr && typeof gr === 'object') sum += Math.max(gr[1] ?? 0, gr[2] ?? 0);
        }
      }
      return sum;
    },
    [dyrektor, przydzialGrupyDyrektor]
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

  /** Dodaje 1 godzinę rozszerzeń do przedmiotu (subKey) w danym roczniku (tryb „Przydziel godziny rozszerzeń”). Zapisuje do API. */
  const dodajGodzineRozszerzen = useCallback(
    (subKey: string, grade: string) => {
      const bySubject = rozszerzeniaPrzydzial[subKey] ?? {};
      const nextBySubject = { ...bySubject, [grade]: (bySubject[grade] ?? 0) + 1 };
      const next = { ...rozszerzeniaPrzydzial, [subKey]: nextBySubject };
      setRozszerzeniaPrzydzial(next);
      onPrzydzialChange?.();
      zapiszDoBazy(przydzial, zrealizowaneDoradztwo, dyrektor, next);
    },
    [rozszerzeniaPrzydzial, przydzial, zrealizowaneDoradztwo, dyrektor, zapiszDoBazy, onPrzydzialChange]
  );

  /** Usuwa 1 godzinę z puli rozszerzeń w danym roczniku (tryb „Usuń godziny”). Gdy podano subKey – tylko z tego przedmiotu; inaczej z pierwszego znalezionego (wiersz „przedmioty o zakresie rozszerzonym”). */
  const cofnijGodzineRozszerzen = useCallback(
    (grade: string, planIdPrefix: string, fromSubKey?: string) => {
      const subKeyWithHour =
        fromSubKey != null && ((rozszerzeniaPrzydzial[fromSubKey] ?? {})[grade] ?? 0) > 0
          ? fromSubKey
          : [...rozszerzeniaSubKeys].find(
              (sk) => sk.startsWith(planIdPrefix) && ((rozszerzeniaPrzydzial[sk] ?? {})[grade] ?? 0) > 0
            );
      if (!subKeyWithHour) return;
      const bySubject = rozszerzeniaPrzydzial[subKeyWithHour] ?? {};
      const current = bySubject[grade] ?? 0;
      if (current <= 0) return;
      const nextVal = current - 1;
      const nextBySubject = nextVal === 0 ? (() => { const o = { ...bySubject }; delete o[grade]; return o; })() : { ...bySubject, [grade]: nextVal };
      const cleaned = Object.fromEntries(Object.entries(nextBySubject).filter(([, v]) => v != null && v > 0)) as Record<string, number>;
      const next = { ...rozszerzeniaPrzydzial, [subKeyWithHour]: Object.keys(cleaned).length > 0 ? cleaned : undefined };
      const nextClean = Object.fromEntries(Object.entries(next).filter(([, v]) => v != null && Object.keys(v!).length > 0)) as Record<string, Record<string, number>>;
      setRozszerzeniaPrzydzial(nextClean);
      setExtendedCellsAdded((prev) => {
        const nextSet = new Set(prev);
        nextSet.delete(`${subKeyWithHour}_${grade}`);
        return nextSet;
      });
      onPrzydzialChange?.();
      zapiszDoBazy(przydzial, zrealizowaneDoradztwo, dyrektor, nextClean);
    },
    [rozszerzeniaPrzydzial, rozszerzeniaSubKeys, przydzial, zrealizowaneDoradztwo, dyrektor, zapiszDoBazy, onPrzydzialChange]
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
          <section
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
                    <th className="px-2 sm:px-3 py-2.5 sm:py-3 font-semibold text-gray-700 w-10 sm:w-12 border-r border-gray-200 text-left">
                      Lp.
                    </th>
                    <th className="px-2 sm:px-3 py-2.5 sm:py-3 font-semibold text-gray-700 min-w-[100px] sm:min-w-[120px] border-r border-gray-200">
                      Przedmiot
                    </th>
                    {hasGrades &&
                      grades.map((g) => (
                        <th
                          key={g}
                          className="px-1.5 sm:px-2 py-2.5 sm:py-3 font-semibold text-gray-700 text-center w-12 sm:w-14 border-r border-gray-200"
                        >
                          {g}
                        </th>
                      ))}
                    <th className="px-2 sm:px-3 py-2.5 sm:py-3 font-semibold text-gray-700 text-right min-w-[5rem] sm:min-w-[6rem] w-24 sm:w-28">
                      Razem
                    </th>
                    <th className="px-2 sm:px-3 py-2.5 sm:py-3 font-semibold text-gray-700 text-right w-20 sm:w-24 border-l border-gray-200 whitespace-nowrap">
                      Zrealizowane godziny
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orderedSubjectsForTable.map((entry, i) => {
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
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right tabular-nums text-gray-800 border-r border-gray-100 min-w-[5rem] sm:min-w-[6rem] w-24 sm:w-28">
                            {tot}
                          </td>
                          <td
                            className={`px-2 sm:px-3 py-1.5 sm:py-2 text-right border-l border-gray-200 text-xs sm:text-sm ${
                              klasaId && tot > 0
                                ? assignedDirectorHoursPlan > tot
                                  ? 'bg-blue-200 font-semibold text-blue-900 ring-1 ring-blue-400 rounded'
                                  : assignedDirectorHoursPlan === tot
                                    ? 'bg-green-200 font-semibold text-green-900 ring-1 ring-green-500 rounded'
                                    : remainingDirectorHours === 1
                                      ? 'bg-amber-200 font-semibold text-amber-900 ring-1 ring-amber-500 rounded'
                                      : 'bg-red-200 font-semibold text-red-900 ring-1 ring-red-500 rounded'
                                : ''
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
                    const obramowanieRozszerzony = czyRozszerzony ? 'border-t-2 border-b-2 border-gray-400' : '';
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
                    /** Różnica plan − realizacja (dla kolorów); może być ujemna przy nadwyżce. */
                    const displayedRemaining = planoweGodziny - razemRzeczywiste;
                    /** Podpis „do przydziału” tylko dla puli „godzin do wyboru”. */
                    const remainingOptionalForLabel = hoursToChoose > 0 ? Math.max(0, hoursToChoose - assignedSum) : 0;
                    /** Wolna pula rozszerzeń dla przedmiotu z etykietą rozszerzenie. */
                    const extensionPoolRemaining =
                      nazwaPogrubiona ? Math.max(0, extendedPoolSize - extendedPoolAssignedTotal) : 0;
                    const rowHasPodzial = groupSplit.rowHasAnySplit(subKey, grades);

                    const cellPodzialClass = trybPodzielNaGrupy && !tylkoOdczyt ? 'cursor-pointer bg-amber-50 hover:bg-amber-100 ring-1 ring-amber-300 rounded' : '';
                    const cellTallClass = 'py-2.5 sm:py-3 min-h-[3.25rem]';
                    return (
                      <Fragment key={i}>
                        <tr className={czyRozszerzony ? 'bg-gray-50/50' : ''}>
                            <td className={`px-2 sm:px-3 ${cellTallClass} text-gray-500 tabular-nums border-r border-gray-100 w-10 sm:w-12 align-top ${obramowanieRozszerzony} ${czyRozszerzony ? 'border-l-2 border-l-gray-400' : ''}`}>
                              {czyRozszerzony ? 'roz.' : row.lp != null ? row.lp : '–'}
                            </td>
                            <td
                              className={`px-2 sm:px-3 ${cellTallClass} border-r border-gray-100 min-w-[100px] sm:min-w-0 align-top ${obramowanieRozszerzony} ${nazwaPogrubiona ? 'font-semibold text-gray-900' : 'text-gray-800'} ${kafelekNazwaKlikalny ? 'cursor-pointer bg-violet-50 hover:bg-violet-100 ring-1 ring-violet-200 rounded' : ''}`}
                          onClick={
                            kafelekNazwaKlikalny
                              ? () => {
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
                                }
                              : undefined
                          }
                          role={kafelekNazwaKlikalny ? 'button' : undefined}
                        >
                          <span>{subject}</span>
                          {nazwaPogrubiona && (
                            <span className="ml-1.5 inline-block px-1.5 py-0.5 text-xs font-normal text-white bg-violet-700 rounded">rozszerzenie</span>
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
                            /** Tło tylko w komórce z przypisaną godziną: fioletowe – godziny rozszerzeń, sky – ponadgodziny zwykłe i nadgodziny dyrektorskie, czerwone – tryb usuwania. W trybie „Przydziel godzinę” nie kładziemy fioletu – ma być zielone. */
                            const bgPonadprogramowa =
                              trybUsunGodzine
                                ? (assigned > 0 || dirH > 0 ? 'bg-red-200' : '')
                                : nazwaPogrubiona && (rozszerzeniaPrzydzial[subKey]?.[g] ?? 0) > 0 && !przydzielGodzineKlikalnyThis
                                  ? 'bg-violet-200'
                                  : maPonadprogramowe && (assigned > 0 || dirH > 0)
                                    ? 'bg-sky-200'
                                    : maNadgodzinyDyrektorWKomorce && dirH > 0
                                      ? 'bg-sky-200'
                                      : '';
                            /** Tło dla komórek z godzinami dyrektorskimi. Nie stosuj gdy tryb przydziału/dyrektorski – wtedy bgKlikalny daje zielony/niebieski/sky. */
                            const bgGodzinyDyrektorskie =
                              maGodzinyDyrektorskie && !maPonadprogramowe && !maNadgodzinyDyrektorWKomorce && !kafelekKlikalnyDyrektor && !kafelekKlikalnyGodziny
                                ? 'bg-sky-50 ring-2 ring-gray-400 rounded'
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
                                      ? klikalneRozszerzeniaThis
                                        ? 'cursor-pointer bg-violet-200 hover:bg-violet-300 ring-2 ring-violet-400 rounded'
                                        : remaining > 0
                                          ? 'cursor-pointer bg-green-200 hover:bg-green-300 ring-2 ring-green-400 rounded'
                                          : 'cursor-pointer bg-blue-200 hover:bg-blue-300 ring-2 ring-blue-400 rounded'
                                      : ''
                                : '';
                            /** W trybie „Przydziel godzinę” dostępne pola świecą obwódką i cieniem, żeby były widoczne mimo innego tła */
                            const swieciPrzydzielGodzine =
                              przydzielGodzineKlikalnyThis
                                ? 'ring-2 ring-green-400 ring-offset-1 ring-offset-white shadow-[0_0_0_2px_rgba(34,197,94,0.7)]'
                                : '';
                            /** Wiersz zbiorczy rozszerzeń: bez porównania do planu MEiN — tylko wskaźnik faktycznych godzin w roczniku */
                            const bgZrealizowaneRozszerzony =
                              czyRozszerzony && klasaId && !kafelekKlikalny && assigned > 0
                                ? 'bg-violet-50 ring-1 ring-violet-200 rounded'
                                : '';
                            const textZrealizowaneRozszerzony =
                              czyRozszerzony && klasaId && !kafelekKlikalny && assigned > 0
                                ? 'text-violet-900 font-semibold'
                                : '';
                            /** Prawy przycisk usuwa tylko godziny (nie grupy) i tylko typu aktywnego przycisku. */
                            const maCoUsunacDyrektor = dirH > 0 && trybPrzydzielDyrektor;
                            const maCoUsunacRozszerzenia = (czyRozszerzony || nazwaPogrubiona) && (extendedAssignedByGrade[g] ?? 0) > 0 && trybPrzydzielGodzinyRozszerzen;
                            const maCoUsunacDoWyboru = assigned > 0 && trybPrzydzielGodzine && !trybPrzydzielGodzinyRozszerzen;
                            const maCoUsunacPrawym = maCoUsunacDyrektor || maCoUsunacRozszerzenia || maCoUsunacDoWyboru;
                            const onContextMenuUsun = maCoUsunacPrawym && !tylkoOdczyt
                              ? (e: React.MouseEvent) => {
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
                            return (
                              <td
                                key={g}
                                className={`px-1.5 sm:px-2 ${cellTallClass} text-center border-r border-gray-100 w-12 sm:w-14 align-top ${kafelekKlikalnyPodzial ? 'cursor-pointer bg-amber-50 hover:bg-amber-100 ring-1 ring-amber-300 rounded' : ''} ${bgPonadprogramowa} ${bgGodzinyDyrektorskie} ${!kafelekKlikalnyPodzial ? bgKlikalny : ''} ${swieciPrzydzielGodzine} ${bgZrealizowaneRozszerzony} ${obramowanieRozszerzony}`}
                                onContextMenu={onContextMenuUsun}
                                onClick={
                                  kafelekKlikalnyPodzial
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
                                        : undefined
                                }
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
                                        ? 'font-bold text-red-700'
                                        : kafelekKlikalnyDyrektor
                                          ? 'font-bold text-sky-700'
                                          : kafelekKlikalnyGodziny
                                            ? klikalneRozszerzeniaThis
                                              ? 'font-bold text-violet-700'
                                              : remaining > 0
                                                ? 'font-bold text-green-700'
                                                : 'font-bold text-blue-700'
                                            : maPonadprogramowe
                                              ? 'font-semibold text-blue-800'
                                              : maNadgodzinyDyrektorWKomorce
                                                ? 'font-semibold text-sky-800'
                                                : maGodzinyDyrektorskie
                                                  ? 'font-bold text-sky-800'
                                                  : 'text-gray-700'
                                  }`}
                                >
                                  {czyRozszerzony
                                    ? klasaId && assigned > 0
                                      ? (
                                          <>
                                            {assigned} z {assigned}
                                          </>
                                        )
                                      : '–'
                                    : cellDisplayTotal > 0
                                      ? dirH > 0
                                        ? <>{cellDisplayTotal - dirH}<span className="text-sky-600 font-semibold">+{dirH}d</span></>
                                        : cellDisplayTotal
                                      : '–'}
                                </span>
                              </td>
                            );
                          })}
                        <td className={`${rowHasPodzial ? 'p-0 min-h-[3.25rem]' : `px-2 sm:px-3 ${cellTallClass} align-top`} text-right tabular-nums font-medium text-gray-800 border-r border-gray-100 min-w-[5rem] sm:min-w-[6rem] w-24 sm:w-28 ${obramowanieRozszerzony}`}>
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
                                  <>{razemRzeczywiste - razemDyrektorskie}<span className="text-sky-600 font-semibold">+{razemDyrektorskie}d</span></>
                                ) : razemRzeczywiste}
                              </span>
                              {razemRzeczywiste !== planoweGodziny && (
                                <span className="block text-xs text-gray-500 mt-0.5 font-normal whitespace-nowrap">
                                  planowo {planoweGodziny}
                                </span>
                              )}
                            </>
                          ) : (
                            totalDisplay(row)
                          )}
                        </td>
                        <td
                          className={`${rowHasPodzial ? 'p-0 min-h-[3.25rem]' : `px-2 sm:px-3 ${cellTallClass} align-top`} text-right border-l border-gray-200 w-20 sm:w-24 text-xs sm:text-sm ${obramowanieRozszerzony} ${czyRozszerzony ? 'border-r-2 border-r-gray-400' : ''} ${
                            rowHasPodzial
                              ? ''
                              : klasaId && (planoweGodziny > 0 || godzinyRozszerzenia > 0 || (row.hours_to_choose != null && row.hours_to_choose > 0) || czyRozszerzony)
                                ? planoweGodziny > 0
                                  ? displayedAssigned > displayedTotal
                                    ? 'bg-blue-200 font-semibold text-blue-900 ring-1 ring-blue-400 rounded'
                                    : displayedAssigned === displayedTotal
                                      ? 'bg-green-200 font-semibold text-green-900 ring-1 ring-green-500 rounded'
                                      : displayedRemaining === 1
                                        ? 'bg-amber-200 font-semibold text-amber-900 ring-1 ring-amber-500 rounded'
                                        : displayedRemaining > 1
                                          ? 'bg-red-200 font-semibold text-red-900 ring-1 ring-red-500 rounded'
                                          : ''
                                  : ''
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
                            <span className="text-gray-400">–</span>
                          ) : planoweGodziny > 0 || godzinyRozszerzenia > 0 || row.hours_to_choose != null || czyRozszerzony ? (
                            klasaId ? (
                              <span className="tabular-nums">
                                {planoweGodziny > 0
                                  ? `${displayedAssigned} z ${displayedTotal}`
                                  : displayedAssigned > 0
                                    ? String(displayedAssigned)
                                    : '–'}
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
                              row.hours_to_choose ?? '–'
                            )
                          ) : (
                            '–'
                          )}
                        </td>
                      </tr>
                    </Fragment>
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
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-gray-500 border-r border-gray-200 min-w-[5rem] sm:min-w-[6rem] w-24 sm:w-28">
                      –
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-gray-500 border-l border-gray-200">
                      –
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

            {przedmiotyLaczne.length > 0 && hasGrades && (
              <section
                className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm w-full min-w-0 mt-6"
                aria-labelledby={`doradztwo-${plan.plan_id ?? idx}`}
              >
                <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-gray-200 bg-gray-50/80">
                  <h3 id={`doradztwo-${plan.plan_id ?? idx}`} className="text-base font-semibold text-gray-800">
                    Zajęcia z zakresu doradztwa zawodowego
                  </h3>
                  {cycleLabel && (
                    <p className="text-xs text-gray-500 mt-0.5">{cycleLabel}</p>
                  )}
                </div>
                <div className="overflow-x-auto -mx-2 sm:mx-0 p-2 sm:p-0" style={{ WebkitOverflowScrolling: 'touch' }}>
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
                            <td
                              className={`px-4 py-2 text-center border-l-2 border-gray-200 align-middle ${
                                klasaId && totalHours > 0
                                  ? suma > totalHours
                                    ? 'bg-blue-200 font-semibold text-blue-900 ring-1 ring-blue-400 rounded'
                                    : suma === totalHours
                                      ? 'bg-green-200 font-semibold text-green-900 ring-1 ring-green-500 rounded'
                                      : totalHours - suma === 1
                                        ? 'bg-amber-200 font-semibold text-amber-900 ring-1 ring-amber-500 rounded'
                                        : 'bg-red-200 font-semibold text-red-900 ring-1 ring-red-500 rounded'
                                  : ''
                              }`}
                            >
                              <span className="tabular-nums font-bold">{suma}</span>
                              <span className="opacity-90"> z </span>
                              <span className="tabular-nums font-semibold">{totalHours}</span>
                              <span className="block text-xs opacity-90 mt-0.5">godz. łącznie</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </Fragment>
        );
      })}

      {/* Modal: godziny ponadprogramowe (do wyboru lub dyrektorskie ponad pulę) */}
      {modalPonadprogramowa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {modalPonadprogramowa.kind === 'optional' ? 'Godziny ponadprogramowe' : 'Godzina dyrektorska ponadprogramowa'}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {modalPonadprogramowa.kind === 'optional' ? (
                <>
                  Wszystkie godziny programowe są przydzielone. Czy chcesz dodać godzinę ponadprogramową do przedmiotu „{modalPonadprogramowa.subjectName}”?
                </>
              ) : (
                <>
                  Limit godzin dyrektorskich z planu to <strong className="text-gray-800">{modalPonadprogramowa.totalDirectorHours}</strong>. Czy na pewno
                  chcesz dodać <strong className="text-gray-800">jedną godzinę dyrektorską ponadprogramową</strong> dla przedmiotu „
                  {modalPonadprogramowa.subjectName}” (rocznik / klasa: <strong className="text-gray-800">{modalPonadprogramowa.grade}</strong>)?
                </>
              )}
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
                  const m = modalPonadprogramowa;
                  if (m.kind === 'optional') {
                    przydzielGodzine(m.subKey, m.grade);
                  } else if (m.splitBothGroups) {
                    groupSplit.addDirectorHourToBothGroups(m.subKey, m.grade);
                  } else {
                    dodajGodzineDyrektorska(m.subKey, m.grade, m.totalDirectorHours, m.planId);
                  }
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

    </div>
  );
}
