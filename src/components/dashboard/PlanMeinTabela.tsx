'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import plansData from '@/utils/import/ramowe-plany.json';

const STORAGE_PREFIX = 'przydzial-wyboru-';
const STORAGE_DORADZTWO = 'zrealizowane-doradztwo-';
const STORAGE_DYREKTOR = 'dyrektor-godziny-';
const STORAGE_DYREKTOR_GRUPY = 'dyrektor-grupy-';

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
  /** Podział na grupy: subKey -> grade -> true = komórka wyświetlana jako połowa | połowa */
  const [podzialNaGrupy, setPodzialNaGrupy] = useState<Record<string, Record<string, boolean>>>({});
  /** Przydział godzin per grupa (1/2) – tylko dla roczników z włączonym podziałem na grupy */
  const [przydzialGrupy, setPrzydzialGrupy] = useState<Record<string, PrzydzialGrupyByGrade>>({});
  /** Godziny dyrektorskie per grupa – gdy podział włączony */
  const [dyrektorGrupy, setDyrektorGrupy] = useState<Record<string, Record<string, { 1: number; 2: number }>>>({});
  const [ladowanieZapis, setLadowanieZapis] = useState(false);
  /** Modal: czy dodać godzinę ponadprogramową (gdy pula wyczerpana, dodaje jako dyrektorską) */
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
  /** Modal: czy dodać godzinę ponadplanową (dyrektorską) dla grupy – obie grupy +1 */
  const [modalPonadprogramowaGrupy, setModalPonadprogramowaGrupy] = useState<{
    subKey: string;
    grade: string;
    subjectName: string;
  } | null>(null);
  /** Klucze przedmiotów oznaczonych jako „rozszerzenie” (pogrubiona nazwa) – tryb „Dodaj rozszerzenia” */
  const [rozszerzeniaSubKeys, setRozszerzeniaSubKeys] = useState<Set<string>>(() => new Set());
  /** Godziny rozszerzeń per przedmiot (subKey -> rocznik -> liczba). Przy odznaczeniu przedmiotu jego godziny znikają z puli. */
  const [rozszerzeniaPrzydzial, setRozszerzeniaPrzydzial] = useState<Record<string, Record<string, number>>>({});
  /** Pula godzin rozszerzeń (suma po przedmiotach rozszerzonych) – używana gdy brak rozszerzeniaPrzydzial (legacy). */
  const [extendedPoolByGradeLegacy, setExtendedPoolByGradeLegacy] = useState<Record<string, number>>({});
  /** Komórki, w których dodano godzinę rozszerzenia w tej sesji – tylko one mają fioletowe tło (klucz: subKey_grade) */
  const [extendedCellsAdded, setExtendedCellsAdded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!klasaId) {
      setPrzydzial({});
      setZrealizowaneDoradztwo({});
      setDyrektor({});
      setPodzialNaGrupy({});
      setPrzydzialGrupy({});
      setDyrektorGrupy({});
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
      .then((data: { przydzial?: Record<string, Record<string, number>>; doradztwo?: Record<string, Record<string, number>>; dyrektor?: Record<string, Record<string, number>>; rozszerzenia?: string[]; rozszerzeniaGodziny?: Record<string, number>; rozszerzeniaPrzydzial?: Record<string, Record<string, number>>; podzialNaGrupy?: Record<string, Record<string, boolean>>; przydzialGrupy?: Record<string, Record<string, { 1: number; 2: number }>>; dyrektorGrupy?: Record<string, Record<string, { 1: number; 2: number }>> }) => {
        if (cancelled) return;
        const p = data.przydzial && typeof data.przydzial === 'object' ? data.przydzial : {};
        const d = data.doradztwo && typeof data.doradztwo === 'object' ? data.doradztwo : {};
        const dy = data.dyrektor && typeof data.dyrektor === 'object' ? data.dyrektor : {};
        const rozszerzeniaArr = Array.isArray(data.rozszerzenia) ? data.rozszerzenia : [];
        const rozszPrzydzial = data.rozszerzeniaPrzydzial && typeof data.rozszerzeniaPrzydzial === 'object' ? data.rozszerzeniaPrzydzial : {};
        const rozszGodz = data.rozszerzeniaGodziny && typeof data.rozszerzeniaGodziny === 'object' ? data.rozszerzeniaGodziny : {};
        const podzial = data.podzialNaGrupy && typeof data.podzialNaGrupy === 'object' ? data.podzialNaGrupy : {};
        const pg = data.przydzialGrupy && typeof data.przydzialGrupy === 'object' ? data.przydzialGrupy : {};
        const dg = data.dyrektorGrupy && typeof data.dyrektorGrupy === 'object' ? data.dyrektorGrupy : {};
        setPrzydzial(p);
        setZrealizowaneDoradztwo(d);
        setDyrektor(dy);
        setRozszerzeniaSubKeys(new Set(rozszerzeniaArr));
        setRozszerzeniaPrzydzial(rozszPrzydzial);
        setExtendedPoolByGradeLegacy(rozszGodz);
        setExtendedCellsAdded(new Set());
        setPodzialNaGrupy(podzial);
        setPrzydzialGrupy(pg);
        setDyrektorGrupy(dg);
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_PREFIX + klasaId, JSON.stringify(p));
            localStorage.setItem(STORAGE_DORADZTWO + klasaId, JSON.stringify(d));
            localStorage.setItem(STORAGE_DYREKTOR + klasaId, JSON.stringify(dy));
            localStorage.setItem(STORAGE_DYREKTOR_GRUPY + klasaId, JSON.stringify(dg));
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
        try {
          const rawDg = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_DYREKTOR_GRUPY + klasaId) : null;
          if (rawDg) {
            const parsed = JSON.parse(rawDg) as Record<string, Record<string, { 1: number; 2: number }>>;
            setDyrektorGrupy(parsed);
          } else {
            setDyrektorGrupy({});
          }
        } catch {
          setDyrektorGrupy({});
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
    (p: Record<string, Record<string, number>>, d: Record<string, Record<string, number>>, dy: Record<string, Record<string, number>>, rozszPrzydzial?: Record<string, Record<string, number>>, pg?: Record<string, PrzydzialGrupyByGrade>, podzial?: Record<string, Record<string, boolean>>, dg?: Record<string, Record<string, { 1: number; 2: number }>>) => {
      if (!klasaId) return;
      const body: { klasaId: string; przydzial: Record<string, Record<string, number>>; doradztwo: Record<string, Record<string, number>>; dyrektor: Record<string, Record<string, number>>; rozszerzeniaPrzydzial?: Record<string, Record<string, number>>; przydzialGrupy?: Record<string, PrzydzialGrupyByGrade>; podzialNaGrupy?: Record<string, Record<string, boolean>>; dyrektorGrupy?: Record<string, Record<string, { 1: number; 2: number }>> } = {
        klasaId,
        przydzial: p,
        doradztwo: d,
        dyrektor: dy,
      };
      if (rozszPrzydzial !== undefined) body.rozszerzeniaPrzydzial = rozszPrzydzial;
      if (pg !== undefined) body.przydzialGrupy = pg;
      if (podzial !== undefined) body.podzialNaGrupy = podzial;
      if (dg !== undefined) body.dyrektorGrupy = dg;
      fetch('/api/przydzial-godzin-wybor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch((err) => console.error('Zapis przydziału do bazy:', err));
    },
    [klasaId]
  );

  /** Zapisuje listę rozszerzeń (i ewentualnie przydział godzin rozszerzeń po odznaczeniu przedmiotu) do bazy. */
  const zapiszRozszerzeniaDoBazy = useCallback(
    (rozszerzenia: string[], rozszPrzydzial?: Record<string, Record<string, number>>) => {
      if (!klasaId) return;
      const przydzialRozszerzen = rozszPrzydzial ?? rozszerzeniaPrzydzial;
      fetch('/api/przydzial-godzin-wybor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          klasaId,
          przydzial,
          doradztwo: zrealizowaneDoradztwo,
          dyrektor,
          rozszerzenia,
          rozszerzeniaPrzydzial: przydzialRozszerzen,
        }),
      }).catch((err) => console.error('Zapis rozszerzeń do bazy:', err));
    },
    [klasaId, przydzial, zrealizowaneDoradztwo, dyrektor, rozszerzeniaPrzydzial]
  );

  /** Przełącza podział na grupy (połowa | połowa) w komórce i zapisuje do bazy. Przy włączeniu migruje godziny z przydzial do przydzialGrupy; przy wyłączeniu – max(gr1,gr2). Gdy tylkoDyrektorskie (np. kl. V: geografia, biologia) – grupy startują od 0,0, można dodać tylko godziny dyrektorskie. */
  const togglePodzialNaGrupy = useCallback(
    (subKey: string, grade: string, mergeContext?: { hoursToChoose: number; grades: string[]; tylkoDyrektorskie?: boolean }) => {
      if (!klasaId) return;
      const bySub = podzialNaGrupy[subKey] ?? {};
      const enabling = !bySub[grade];
      const nextPodzial = { ...podzialNaGrupy, [subKey]: { ...bySub, [grade]: enabling } };
      setPodzialNaGrupy(nextPodzial);

      let nextPrzydzial = przydzial;
      let nextPrzydzialGrupy = przydzialGrupy;
      let nextDyrektor = dyrektor;
      let nextDyrektorGrupy = dyrektorGrupy;

      if (enabling) {
        const current = (przydzial[subKey] ?? {})[grade] ?? 0;
        /** Tylko dyrektorskie (np. kl. V przedmioty kończące się w IV): grupy 0,0. W przeciwnym razie: przy current>=1 rozdziel, przy 0 zostaw 0,0. */
        const tylkoDyrektorskie = mergeContext?.tylkoDyrektorskie === true;
        const total = tylkoDyrektorskie ? 0 : (current >= 1 ? current : 0);
        const h1 = total >= 1 ? Math.floor(total / 2) : 0;
        const h2 = total >= 1 ? total - h1 : 0;
        const bySubG = przydzialGrupy[subKey] ?? {};
        nextPrzydzialGrupy = { ...przydzialGrupy, [subKey]: { ...bySubG, [grade]: { 1: h1, 2: h2 } } };
        setPrzydzialGrupy(nextPrzydzialGrupy);
        const bySubject = przydzial[subKey] ?? {};
        const { [grade]: _rem, ...rest } = bySubject;
        nextPrzydzial = { ...przydzial, [subKey]: rest };
        if (current > 0) setPrzydzial(nextPrzydzial);
        const dirCurrent = (dyrektor[subKey] ?? {})[grade] ?? 0;
        if (dirCurrent > 0) {
          const d1 = Math.floor(dirCurrent / 2);
          const d2 = dirCurrent - d1;
          const bySubDg = dyrektorGrupy[subKey] ?? {};
          nextDyrektorGrupy = { ...dyrektorGrupy, [subKey]: { ...bySubDg, [grade]: { 1: d1, 2: d2 } } };
          setDyrektorGrupy(nextDyrektorGrupy);
          const bySubjectD = dyrektor[subKey] ?? {};
          const { [grade]: _dRem, ...restD } = bySubjectD;
          nextDyrektor = { ...dyrektor, [subKey]: restD };
          setDyrektor(nextDyrektor);
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(STORAGE_DYREKTOR + klasaId, JSON.stringify(nextDyrektor));
              localStorage.setItem(STORAGE_DYREKTOR_GRUPY + klasaId, JSON.stringify(nextDyrektorGrupy));
            }
          } catch (_) {}
        }
      } else {
        const gr = przydzialGrupy[subKey]?.[grade];
        const dr = dyrektorGrupy[subKey]?.[grade];
        const gr1 = gr?.[1] ?? 0;
        const gr2 = gr?.[2] ?? 0;
        const dr1 = dr?.[1] ?? 0;
        const dr2 = dr?.[2] ?? 0;
        /** Merge: max(gr1,gr2) – liczba łączna godzin nie zmienia się. Cap do planu gdy przekroczenie. */
        let mergedAssigned = Math.max(gr1, gr2);
        if (mergeContext && mergeContext.hoursToChoose > 0) {
          let assignedInOtherGrades = 0;
          for (const k of mergeContext.grades) {
            if (k === grade) continue;
            if (podzialNaGrupy[subKey]?.[k]) {
              const other = przydzialGrupy[subKey]?.[k];
              assignedInOtherGrades += Math.max(other?.[1] ?? 0, other?.[2] ?? 0);
            } else {
              assignedInOtherGrades += (przydzial[subKey] ?? {})[k] ?? 0;
            }
          }
          mergedAssigned = Math.min(mergedAssigned, Math.max(0, mergeContext.hoursToChoose - assignedInOtherGrades));
        }
        const mergedDirector = Math.max(dr1, dr2);

        const bySubG = przydzialGrupy[subKey] ?? {};
        const { [grade]: _rem, ...restByGrade } = bySubG;
        nextPrzydzialGrupy = Object.keys(restByGrade).length === 0 ? (() => { const o = { ...przydzialGrupy }; delete o[subKey]; return o; })() : { ...przydzialGrupy, [subKey]: restByGrade };
        setPrzydzialGrupy(nextPrzydzialGrupy);
        if (mergedAssigned > 0) {
          nextPrzydzial = { ...przydzial, [subKey]: { ...(przydzial[subKey] ?? {}), [grade]: mergedAssigned } };
          setPrzydzial(nextPrzydzial);
        }
        const bySubDg = dyrektorGrupy[subKey] ?? {};
        const { [grade]: _dRem, ...restByGradeD } = bySubDg;
        nextDyrektorGrupy = Object.keys(restByGradeD).length === 0 ? (() => { const o = { ...dyrektorGrupy }; delete o[subKey]; return o; })() : { ...dyrektorGrupy, [subKey]: restByGradeD };
        setDyrektorGrupy(nextDyrektorGrupy);
        const bySubjectD = dyrektor[subKey] ?? {};
        if (mergedDirector > 0) {
          nextDyrektor = { ...dyrektor, [subKey]: { ...bySubjectD, [grade]: mergedDirector } };
        } else {
          const { [grade]: _del, ...restD } = bySubjectD;
          const cleaned = Object.keys(restD).length === 0 ? (() => { const o = { ...dyrektor }; delete o[subKey]; return o; })() : { ...dyrektor, [subKey]: restD };
          nextDyrektor = cleaned;
        }
        setDyrektor(nextDyrektor);
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_DYREKTOR + klasaId, JSON.stringify(nextDyrektor));
            localStorage.setItem(STORAGE_DYREKTOR_GRUPY + klasaId, JSON.stringify(nextDyrektorGrupy));
          }
        } catch (_) {}
      }

      onPrzydzialChange?.();
      zapiszDoBazy(nextPrzydzial, zrealizowaneDoradztwo, nextDyrektor, undefined, nextPrzydzialGrupy, nextPodzial, nextDyrektorGrupy);
    },
    [klasaId, podzialNaGrupy, przydzial, przydzialGrupy, zrealizowaneDoradztwo, dyrektor, dyrektorGrupy, zapiszDoBazy, onPrzydzialChange]
  );

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
    (subKey: string, grade: string, hoursToChoose?: number, group?: 1 | 2) => {
      if (group === 1 || group === 2) {
        if (podzialNaGrupy[subKey]?.[grade]) {
          if (hoursToChoose != null && hoursToChoose > 0) {
            const fromGrupy = przydzialGrupy[subKey] ?? {};
            const currentGr1 = fromGrupy[grade]?.[1] ?? 0;
            const currentGr2 = fromGrupy[grade]?.[2] ?? 0;
            const addingToSmallerGroup = (group === 1 && currentGr1 < currentGr2) || (group === 2 && currentGr2 < currentGr1);
            if (!addingToSmallerGroup) {
              const fromPrzydzial = przydzial[subKey] ?? {};
              const allGrades = new Set([...Object.keys(fromPrzydzial), ...Object.keys(fromGrupy)]);
              let assignedSum = 0;
              for (const k of allGrades) {
                if (podzialNaGrupy[subKey]?.[k]) {
                  const gr1 = fromGrupy[k]?.[1] ?? 0;
                  const gr2 = fromGrupy[k]?.[2] ?? 0;
                  assignedSum += Math.max(gr1, gr2);
                } else {
                  assignedSum += fromPrzydzial[k] ?? 0;
                }
              }
              if (assignedSum >= hoursToChoose) return;
            }
          }
          const bySub = przydzialGrupy[subKey] ?? {};
          const byGrade = bySub[grade] ?? { 1: 0, 2: 0 };
          const nextByGrade = { ...byGrade, [group]: (byGrade[group] ?? 0) + 1 };
          const next = { ...przydzialGrupy, [subKey]: { ...bySub, [grade]: nextByGrade } };
          setPrzydzialGrupy(next);
          onPrzydzialChange?.();
          zapiszDoBazy(przydzial, zrealizowaneDoradztwo, dyrektor, undefined, next);
          return;
        }
      }
      const bySubject = przydzial[subKey] ?? {};
      const byGrade = (bySubject[grade] ?? 0) + 1;
      zapiszPrzydzial({
        ...przydzial,
        [subKey]: { ...bySubject, [grade]: byGrade },
      });
    },
    [przydzial, przydzialGrupy, podzialNaGrupy, zapiszPrzydzial, zapiszDoBazy, zrealizowaneDoradztwo, dyrektor, onPrzydzialChange]
  );

  const cofnijGodzine = useCallback(
    (subKey: string, grade: string, group?: 1 | 2) => {
      if (group === 1 || group === 2) {
        if (podzialNaGrupy[subKey]?.[grade]) {
          const bySub = przydzialGrupy[subKey] ?? {};
          const byGrade = bySub[grade] ?? { 1: 0, 2: 0 };
          const current = byGrade[group] ?? 0;
          if (current <= 0) {
            /** Gdy w przydzialGrupy jeszcze brak godzin (dopiero włączono podział), a w przydzial jest stara przypisana godzina – usuń z przydzial. */
            const oldAssigned = przydzial[subKey]?.[grade] ?? 0;
            if (oldAssigned > 0) {
              const bySubject = przydzial[subKey] ?? {};
              const nextVal = oldAssigned - 1;
              const nextBySubject = nextVal === 0 ? (() => { const o = { ...bySubject }; delete o[grade]; return o; })() : { ...bySubject, [grade]: nextVal };
              const cleaned = Object.fromEntries(Object.entries(nextBySubject).filter(([, v]) => v != null && v > 0)) as Record<string, number>;
              zapiszPrzydzial({ ...przydzial, [subKey]: cleaned });
              onPrzydzialChange?.();
              zapiszDoBazy({ ...przydzial, [subKey]: cleaned }, zrealizowaneDoradztwo, dyrektor, undefined, przydzialGrupy);
            }
            return;
          }
          const nextByGrade = { ...byGrade, [group]: current - 1 };
          const sum = (nextByGrade[1] ?? 0) + (nextByGrade[2] ?? 0);
          /** Zachowujemy wpis {1:0, 2:0} gdy sum=0, aby można było ponownie dodawać zwykłe godziny (pula jest wolna). */
          const nextBySub = { ...bySub, [grade]: nextByGrade };
          const next = { ...przydzialGrupy, [subKey]: nextBySub };
          setPrzydzialGrupy(next);
          onPrzydzialChange?.();
          zapiszDoBazy(przydzial, zrealizowaneDoradztwo, dyrektor, undefined, next);
          return;
        }
      }
      const bySubject = przydzial[subKey] ?? {};
      const current = bySubject[grade] ?? 0;
      if (current <= 0) return;
      const next = current - 1;
      const nextBySubject = next === 0 ? { ...bySubject, [grade]: undefined } : { ...bySubject, [grade]: next };
      const cleaned = Object.fromEntries(Object.entries(nextBySubject).filter(([, v]) => v != null && v > 0)) as Record<string, number>;
      zapiszPrzydzial({ ...przydzial, [subKey]: cleaned });
    },
    [przydzial, przydzialGrupy, podzialNaGrupy, zapiszPrzydzial, zapiszDoBazy, zrealizowaneDoradztwo, dyrektor, onPrzydzialChange]
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
      zapiszDoBazy(przydzial, zrealizowaneDoradztwo, next, undefined, przydzialGrupy, podzialNaGrupy, dyrektorGrupy);
    },
    [klasaId, onPrzydzialChange, przydzial, zrealizowaneDoradztwo, przydzialGrupy, podzialNaGrupy, dyrektorGrupy, zapiszDoBazy]
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

  /** Suma przypisanych godzin dyrektorskich dla danego planu. Z dyrektorGrupy liczy max(gr1,gr2) – 1 godz. dyrektorska = 1 lekcja (obie grupy +1). */
  const assignedDirectorForPlan = useCallback(
    (planId: string | undefined): number => {
      const prefix = (planId ?? 'plan') + '_';
      let sum = 0;
      for (const [key, byGrade] of Object.entries(dyrektor)) {
        if (!key.startsWith(prefix)) continue;
        for (const v of Object.values(byGrade)) sum += v;
      }
      for (const [key, byGrade] of Object.entries(dyrektorGrupy)) {
        if (!key.startsWith(prefix)) continue;
        for (const gr of Object.values(byGrade)) {
          if (gr && typeof gr === 'object') sum += Math.max(gr[1] ?? 0, gr[2] ?? 0);
        }
      }
      return sum;
    },
    [dyrektor, dyrektorGrupy]
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

  /** Dodaje 1 godzinę dyrektorską do obu grup (lekcja wspólna – obie grupy +1). */
  const dodajGodzineDyrektorskaGrupyObie = useCallback(
    (subKey: string, grade: string) => {
      const bySub = dyrektorGrupy[subKey] ?? {};
      const byGrade = bySub[grade] ?? { 1: 0, 2: 0 };
      const nextByGrade = { 1: (byGrade[1] ?? 0) + 1, 2: (byGrade[2] ?? 0) + 1 };
      const next = { ...dyrektorGrupy, [subKey]: { ...bySub, [grade]: nextByGrade } };
      setDyrektorGrupy(next);
      try {
        localStorage.setItem(STORAGE_DYREKTOR_GRUPY + klasaId, JSON.stringify(next));
      } catch (_) {}
      onPrzydzialChange?.();
      zapiszDoBazy(przydzial, zrealizowaneDoradztwo, dyrektor, undefined, przydzialGrupy, podzialNaGrupy, next);
    },
    [klasaId, dyrektorGrupy, przydzial, zrealizowaneDoradztwo, dyrektor, przydzialGrupy, podzialNaGrupy, zapiszDoBazy, onPrzydzialChange]
  );

  const dodajGodzineDyrektorskaGrupy = useCallback(
    (subKey: string, grade: string, _group?: 1 | 2) => {
      /** Godzina dyrektorska w podzielonej klasie = wspólna lekcja, obie grupy +1. */
      dodajGodzineDyrektorskaGrupyObie(subKey, grade);
    },
    [dodajGodzineDyrektorskaGrupyObie]
  );

  /** Usuwa 1 godzinę dyrektorską (wspólną) – obie grupy -1. */
  const usunGodzineDyrektorskaGrupyObie = useCallback(
    (subKey: string, grade: string) => {
      const bySub = dyrektorGrupy[subKey] ?? {};
      const byGrade = bySub[grade] ?? { 1: 0, 2: 0 };
      const g1 = Math.max(0, (byGrade[1] ?? 0) - 1);
      const g2 = Math.max(0, (byGrade[2] ?? 0) - 1);
      let next: Record<string, Record<string, { 1: number; 2: number }>>;
      if (g1 === 0 && g2 === 0) {
        const { [grade]: _rem, ...restByGrade } = bySub;
        next = Object.keys(restByGrade).length === 0 ? (() => { const o = { ...dyrektorGrupy }; delete o[subKey]; return o; })() : { ...dyrektorGrupy, [subKey]: restByGrade };
      } else {
        next = { ...dyrektorGrupy, [subKey]: { ...bySub, [grade]: { 1: g1, 2: g2 } } };
      }
      setDyrektorGrupy(next);
      try {
        localStorage.setItem(STORAGE_DYREKTOR_GRUPY + klasaId, JSON.stringify(next));
      } catch (_) {}
      onPrzydzialChange?.();
      zapiszDoBazy(przydzial, zrealizowaneDoradztwo, dyrektor, undefined, przydzialGrupy, podzialNaGrupy, next);
    },
    [klasaId, dyrektorGrupy, przydzial, zrealizowaneDoradztwo, dyrektor, przydzialGrupy, podzialNaGrupy, zapiszDoBazy, onPrzydzialChange]
  );

  const usunGodzineDyrektorskaGrupy = useCallback(
    (subKey: string, grade: string, _group: 1 | 2) => {
      usunGodzineDyrektorskaGrupyObie(subKey, grade);
    },
    [usunGodzineDyrektorskaGrupyObie]
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
          const fromPrzydzial = przydzial[subKey] ?? {};
          const fromGrupy = przydzialGrupy[subKey] ?? {};
          const fromDyrektor = dyrektor[subKey] ?? {};
          const fromDyrektorGrupy = dyrektorGrupy[subKey] ?? {};
          grades.forEach((g) => {
            const base = (row.hours_by_grade?.[g] ?? 0) as number;
            let assigned: number;
            let dirH: number;
            if (klasaId && podzialNaGrupy[subKey]?.[g]) {
              const gr = fromGrupy[g];
              const dr = fromDyrektorGrupy[g];
              assigned = Math.max(gr?.[1] ?? 0, gr?.[2] ?? 0);
              dirH = Math.max(dr?.[1] ?? 0, dr?.[2] ?? 0);
            } else {
              assigned = klasaId ? (fromPrzydzial[g] ?? 0) : 0;
              dirH = klasaId ? (fromDyrektor[g] ?? 0) : 0;
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

        /** Pula godzin rozszerzeń (łącznie) – z rozszerzeniaPrzydzial (suma po przedmiotach rozszerzonych tego planu) lub legacy */
        let extendedPoolAssignedTotal = 0;
        const extendedAssignedByGrade: Record<string, number> = {};
        grades.forEach((g) => { extendedAssignedByGrade[g] = 0; });
        const planIdPrefix = (plan.plan_id ?? 'plan') + '_';
        if (klasaId && Object.keys(rozszerzeniaPrzydzial).length > 0) {
          rozszerzeniaSubKeys.forEach((subKey) => {
            if (!subKey.startsWith(planIdPrefix)) return;
            const byG = rozszerzeniaPrzydzial[subKey] ?? {};
            grades.forEach((g) => {
              const v = byG[g] ?? 0;
              extendedAssignedByGrade[g] = (extendedAssignedByGrade[g] ?? 0) + v;
              extendedPoolAssignedTotal += v;
            });
          });
        } else if (klasaId) {
          grades.forEach((g) => {
            const v = extendedPoolByGradeLegacy[g] ?? 0;
            extendedAssignedByGrade[g] = v;
            extendedPoolAssignedTotal += v;
          });
        }
        /** Godziny rozszerzeń wliczamy do sumy godzin w roku (sumByGrade) */
        grades.forEach((g) => {
          sumByGrade[g] = (sumByGrade[g] ?? 0) + (extendedAssignedByGrade[g] ?? 0);
        });
        /** Pula godzin rozszerzeń i limity na rok – z wiersza „przedmioty o zakresie rozszerzonym” w planie (np. liceum 22, technikum 8). */
        const firstRozszerzonyRow = rozszerzonyEntries[0] as SubjectRow | undefined;
        const extendedPoolSize = firstRozszerzonyRow?.total_hours != null ? (firstRozszerzonyRow.total_hours as number) : getGodzinyRozszerzenia(plan.school_type ?? '');
        const extendedLimityByGrade: Record<string, number> = {};
        if (firstRozszerzonyRow?.hours_by_grade) {
          grades.forEach((g) => {
            extendedLimityByGrade[g] = (firstRozszerzonyRow.hours_by_grade?.[g] ?? 0) as number;
          });
        }

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
                                  : remainingDirectorHours === 0
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
                                {remainingDirectorHours > 0 && (
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
                    /** Dla roczników z podziałem: max(gr1,gr2) – liczba efektywna (ta sama co przy merge). Dla pozostałych z przydzial. */
                    const assignedByGrade = klasaId
                      ? (() => {
                          const fromPrzydzial = przydzial[subKey] ?? {};
                          const byGrade: Record<string, number> = {};
                          for (const g of grades) {
                            if (podzialNaGrupy[subKey]?.[g]) {
                              const gr = przydzialGrupy[subKey]?.[g];
                              byGrade[g] = Math.max(gr?.[1] ?? 0, gr?.[2] ?? 0);
                            } else {
                              byGrade[g] = fromPrzydzial[g] ?? 0;
                            }
                          }
                          return byGrade;
                        })()
                      : {};
                    const directorByGrade = klasaId ? (dyrektor[subKey] ?? {}) : {};
                    const assignedSum = Object.values(assignedByGrade).reduce((a, b) => a + b, 0);
                    const remaining = hoursToChoose - assignedSum;
                    const czyRozszerzony = isPrzedmiotRozszerzony(subject);
                    const obramowanieRozszerzony = czyRozszerzony ? 'border-t-2 border-b-2 border-gray-400' : '';
                    const nazwaPogrubiona = rozszerzeniaSubKeys.has(subKey);
                    const godzinyRozszerzenia = nazwaPogrubiona ? extendedPoolSize : 0;
                    const canAssign = klasaId && hoursToChoose > 0 && remaining > 0;
                    /** Klikalne w trybie „Przydziel godzinę” także gdy programowe się skończyły (modal ponadprogramowe). W trybie „Przydziel godziny rozszerzeń” tylko przedmioty rozszerzone, gdy pula i limit na rok mają wolne. */
                    const canAssignOrPonadprogramowe =
                      klasaId && (hoursToChoose > 0 || (nazwaPogrubiona && extendedPoolAssignedTotal < extendedPoolSize));
                    const canAddDirector = klasaId && totalDirectorHours > 0 && remainingDirectorHours > 0;
                    /** Klikalne w trybie „Godz. dyrektorskie” tylko gdy pula ma wolne (limit godzin dyrektorskich). */
                    const canAddDirectorOrPonadprogramowe = klasaId && totalDirectorHours > 0 && remainingDirectorHours > 0;
                    const maPonadprogramowe = assignedSum > hoursToChoose;
                    const maNadgodzinyDyrektorskie = totalDirectorHours > 0 && assignedDirectorHoursPlan > totalDirectorHours;
                    /** Suma rzeczywista godzin w wierszu (baza + do wyboru + dyrektorskie + rozszerzenia) – aktualizuje się przy dodawaniu. W wierszu „przedmioty o zakresie rozszerzonym” baza = 0 (tylko przypisane z puli). */
                    const razemRzeczywiste = hasGrades
                      ? grades.reduce(
                          (s, g) =>
                            s +
                            (czyRozszerzony ? 0 : ((row.hours_by_grade?.[g] ?? 0) as number)) +
                            (assignedByGrade[g] ?? 0) +
                            (directorByGrade[g] ?? 0) +
                            (czyRozszerzony ? (extendedAssignedByGrade[g] ?? 0) : (nazwaPogrubiona ? (rozszerzeniaPrzydzial[subKey]?.[g] ?? 0) : 0)),
                          0
                        )
                      : 0;
                    /** Liczba planowych godzin z MEiN (Razem w planie). W wierszu „przedmioty o zakresie rozszerzonym” = pula (np. 8), nie dodajemy base. */
                    const planoweGodziny = czyRozszerzony
                      ? (row.total_hours ?? 0)
                      : (row.total_hours ?? (hasGrades ? grades.reduce((s, g) => s + ((row.hours_by_grade?.[g] ?? 0) as number), 0) : 0));

                    const kafelekNazwaKlikalny = trybDodajRozszerzenia && !tylkoOdczyt && !czyRozszerzony;
                    /** W wierszu „przedmioty o zakresie rozszerzonym”: zrealizowane = suma godzin z puli rozszerzeń (aktualizuje się przy dodawaniu/usuwaniu). Dla przedmiotów oznaczonych jako rozszerzone: zwykłe + pula (np. 2+1=3 z 12). */
                    const displayedAssigned = czyRozszerzony
                      ? extendedPoolAssignedTotal
                      : nazwaPogrubiona
                        ? assignedSum + extendedPoolAssignedTotal
                        : assignedSum;
                    const displayedTotal = czyRozszerzony
                      ? planoweGodziny
                      : nazwaPogrubiona
                        ? hoursToChoose + extendedPoolSize
                        : hoursToChoose + godzinyRozszerzenia;
                    const displayedRemaining = displayedTotal - displayedAssigned;
                    /** Dla podziału na grupy: wartości per rocznik (do jednej linii wzdłuż lat + Razem). */
                    const gradeTotals = hasGrades && !czyRozszerzony
                      ? grades.map((g) => {
                          const base = (row.hours_by_grade?.[g] ?? 0) as number;
                          const assigned = assignedByGrade[g] ?? 0;
                          const dirH = directorByGrade[g] ?? 0;
                          const total = nazwaPogrubiona && !czyRozszerzony
                            ? base + assigned + (extendedAssignedByGrade[g] ?? 0) + dirH
                            : base + assigned + dirH;
                          return { g, total };
                        })
                      : [];
                    const rowHasPodzial = gradeTotals.length > 0 && gradeTotals.some(({ g }) => podzialNaGrupy[subKey]?.[g] === true);
                    /** Przypisane: roczniki z podziałem → grupa 1/2 z przydzialGrupy; gdy brak wpisu w przydzialGrupy, używamy starego przydzial (ta sama liczba u góry i na dole). Roczniki bez podziału → ich godziny do obu grup. */
                    const assignedG1 = gradeTotals.reduce((s, { g }) => {
                      if (podzialNaGrupy[subKey]?.[g] !== true) return s + ((assignedByGrade[g] ?? 0) + (directorByGrade[g] ?? 0));
                      const gr1 = przydzialGrupy[subKey]?.[g]?.[1] ?? 0;
                      const gr2 = przydzialGrupy[subKey]?.[g]?.[2] ?? 0;
                      const oldAssigned = przydzial[subKey]?.[g] ?? 0;
                      const fromGrupy = (gr1 + gr2) > 0 ? gr1 : oldAssigned;
                      return s + fromGrupy;
                    }, 0);
                    const assignedG2 = gradeTotals.reduce((s, { g }) => {
                      if (podzialNaGrupy[subKey]?.[g] !== true) return s + ((assignedByGrade[g] ?? 0) + (directorByGrade[g] ?? 0));
                      const gr1 = przydzialGrupy[subKey]?.[g]?.[1] ?? 0;
                      const gr2 = przydzialGrupy[subKey]?.[g]?.[2] ?? 0;
                      const oldAssigned = przydzial[subKey]?.[g] ?? 0;
                      const fromGrupy = (gr1 + gr2) > 0 ? gr2 : oldAssigned;
                      return s + fromGrupy;
                    }, 0);
                    /** Łączna liczba godzin per grupa (z bazą). Dla podziału: grupa dostaje base+gr+dirH z dyrektorGrupy; bez podziału – godziny do obu grup. */
                    const totalG1 = gradeTotals.reduce((s, { g }) => {
                      const base = (row.hours_by_grade?.[g] ?? 0) as number;
                      if (podzialNaGrupy[subKey]?.[g] !== true) return s + base + (assignedByGrade[g] ?? 0) + (directorByGrade[g] ?? 0);
                      const gr1 = przydzialGrupy[subKey]?.[g]?.[1] ?? 0;
                      const gr2 = przydzialGrupy[subKey]?.[g]?.[2] ?? 0;
                      const oldAssigned = przydzial[subKey]?.[g] ?? 0;
                      const fromGrupy = (gr1 + gr2) > 0 ? gr1 : oldAssigned;
                      const dirG1 = dyrektorGrupy[subKey]?.[g]?.[1] ?? 0;
                      return s + base + fromGrupy + dirG1;
                    }, 0);
                    const totalG2 = gradeTotals.reduce((s, { g }) => {
                      const base = (row.hours_by_grade?.[g] ?? 0) as number;
                      if (podzialNaGrupy[subKey]?.[g] !== true) return s + base + (assignedByGrade[g] ?? 0) + (directorByGrade[g] ?? 0);
                      const gr1 = przydzialGrupy[subKey]?.[g]?.[1] ?? 0;
                      const gr2 = przydzialGrupy[subKey]?.[g]?.[2] ?? 0;
                      const oldAssigned = przydzial[subKey]?.[g] ?? 0;
                      const fromGrupy = (gr1 + gr2) > 0 ? gr2 : oldAssigned;
                      const dirG2 = dyrektorGrupy[subKey]?.[g]?.[2] ?? 0;
                      return s + base + fromGrupy + dirG2;
                    }, 0);
                    /** Stały plan (max) per grupa: suma base+dirH + godziny do wyboru. Używamy jako mianownik w „X z Y”. */
                    /** Wolna pula do przydziału: można dodawać do grup dopóki assignedSum < hoursToChoose. */
                    /** Plan dla zwykłych godzin (baza + godziny do wyboru) – pula jest współdzielona między grupy. */
                    const planRegular = gradeTotals.length > 0
                      ? grades.reduce((s, g) => s + ((row.hours_by_grade?.[g] ?? 0) as number), 0) + hoursToChoose
                      : 0;
                    /** Max dla grupy (z dyrektorskimi) – po przekroczeniu planRegular można tylko dyrektorskie. */
                    const planMaxPerGroup = planRegular + totalDirectorHours;
                    /** Pula (hoursToChoose) współdzielona. Wolna pula = remaining > 0. Dodatkowo: gdy gr2<gr1 (lub gr1<gr2), dodanie do mniejszej grupy nie zużywa puli – można dodać zwykłą godzinę. */
                    const poolMaWolne = remaining > 0;

                    const cellPodzialClass = trybPodzielNaGrupy && !tylkoOdczyt ? 'cursor-pointer bg-gradient-to-b from-amber-50/80 to-orange-50/60 hover:from-amber-100/90 hover:to-orange-100/70 ring-1 ring-amber-200/80 hover:ring-amber-400/60 rounded-lg transition-all duration-200 shadow-sm' : '';
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
                                    zapiszRozszerzeniaDoBazy(Array.from(next), nextPrzydzial);
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
                            /** W wierszu „przedmioty o zakresie rozszerzonym”: assigned = suma godzin rozszerzeń w tym roczniku (limit: 1, 1, 2, 2, 2…) */
                            const assigned = czyRozszerzony
                              ? (extendedAssignedByGrade[g] ?? 0)
                              : (assignedByGrade[g] ?? 0);
                            const dirH = directorByGrade[g] ?? 0;
                            const total = base + assigned + dirH;
                            /** W kafelku przedmiotu rozszerzonego (nazwaPogrubiona) pokazujemy też godziny z puli rozszerzeń w tym roczniku, żeby +1 było widoczne po dodaniu */
                            const cellDisplayTotal = nazwaPogrubiona && !czyRozszerzony
                              ? base + assigned + (extendedAssignedByGrade[g] ?? 0) + dirH
                              : total;
                            const canAssignThis =
                              canAssign && canPrzydzielacWKomorce(plan.school_type ?? '', g, subject);
                            const canAssignOrPonadprogramoweThis =
                              canAssignOrPonadprogramowe && canPrzydzielacWKomorce(plan.school_type ?? '', g, subject);
                            const canAddDirectorThis = canAddDirector && canPrzydzielacWKomorce(plan.school_type ?? '', g, subject, true) && !czyRozszerzony;
                            const canAddDirectorOrPonadprogramoweThis = canAddDirectorOrPonadprogramowe && canPrzydzielacWKomorce(plan.school_type ?? '', g, subject, true) && !czyRozszerzony;
                            /** W trybie „Przydziel godziny rozszerzeń”: można dodać tylko gdy pula ma wolne i w tym roczniku nie przekroczono limitu (1, 1, 2, 2, 2…) */
                            const canAddExtendedThisGrade =
                              (extendedAssignedByGrade[g] ?? 0) < (extendedLimityByGrade[g] ?? 0);
                            const klikalneRozszerzeniaThis =
                              trybPrzydzielGodzinyRozszerzen &&
                              nazwaPogrubiona &&
                              extendedPoolAssignedTotal < extendedPoolSize &&
                              canAddExtendedThisGrade &&
                              canPrzydzielacWKomorce(plan.school_type ?? '', g, subject, true);
                            /** W trybie „Przydziel godzinę”: zwykłe gdy pula wolna; ponadprogramowe (dyrektorskie) gdy pula wyczerpana ALE dyrektorska pula ma wolne (limit!). */
                            const kafelekKlikalnyGodziny =
                              (trybPrzydzielGodzine && !trybPrzydzielGodzinyRozszerzen && canAssignOrPonadprogramoweThis && hoursToChoose > 0 && (remaining > 0 || (remainingDirectorHours > 0 && totalDirectorHours > 0))) ||
                              klikalneRozszerzeniaThis;
                            /** Komórka klikalna w trybie „Przydziel godzinę” (zwykłe godziny) – świeci obwódką/cieniem mimo innego tła */
                            const przydzielGodzineKlikalnyThis =
                              trybPrzydzielGodzine && !trybPrzydzielGodzinyRozszerzen && canAssignOrPonadprogramoweThis && hoursToChoose > 0 && (remaining > 0 || (remainingDirectorHours > 0 && totalDirectorHours > 0));
                            const kafelekKlikalnyDyrektor = trybPrzydzielDyrektor && canAddDirectorOrPonadprogramoweThis;
                            const kafelekKlikalnyUsun = trybUsunGodzine && (dirH > 0 || assigned > 0 || (nazwaPogrubiona && (rozszerzeniaPrzydzial[subKey]?.[g] ?? 0) > 0) || (czyRozszerzony && (extendedAssignedByGrade[g] ?? 0) > 0));
                            const kafelekKlikalnyPodzial = trybPodzielNaGrupy && !trybPrzydzielDyrektor && !trybPrzydzielGodzine && !tylkoOdczyt && !czyRozszerzony;
                            const kafelekKlikalny = kafelekKlikalnyPodzial || kafelekKlikalnyGodziny || kafelekKlikalnyDyrektor || kafelekKlikalnyUsun;
                            const podzialWlaczony = !czyRozszerzony && (podzialNaGrupy[subKey]?.[g] === true);
                            if (podzialWlaczony) {
                              const tylkoDyrektorskieWTejKomorce = !canPrzydzielacWKomorce(plan.school_type ?? '', g, subject);
                              const gr1 = przydzialGrupy[subKey]?.[g]?.[1] ?? 0;
                              const gr2 = przydzialGrupy[subKey]?.[g]?.[2] ?? 0;
                              const oldAssigned = przydzial[subKey]?.[g] ?? 0;
                              const hasGroupAssignment = (gr1 + gr2) > 0;
                              const assignedG1Cell = hasGroupAssignment ? gr1 : oldAssigned;
                              const assignedG2Cell = hasGroupAssignment ? gr2 : oldAssigned;
                              /** Do wyświetlania: tylko liczba godzin grupy w tej komórce (baza + przypisane + dyrektor). Pusta grupa = 0, nie „plan”. */
                              const dirG1Cell = dyrektorGrupy[subKey]?.[g]?.[1] ?? 0;
                              const dirG2Cell = dyrektorGrupy[subKey]?.[g]?.[2] ?? 0;
                              const totalG1Cell = base + assignedG1Cell + dirG1Cell;
                              const totalG2Cell = base + assignedG2Cell + dirG2Cell;
                              /** Zwykłe godziny: pula wolna LUB dodanie do mniejszej grupy (gr1<gr2/gr2<gr1 – nie zużywa puli). Limit to tylko pula, nie totalG1/totalG2 (te zawierają dyrektorskie – nie blokować). */
                              const canAddRegularG1Cell = poolMaWolne || (gr1 < gr2);
                              const canAddRegularG2Cell = poolMaWolne || (gr2 < gr1);
                              const klikPrzydzielG1 = trybPrzydzielGodzine && !trybPrzydzielGodzinyRozszerzen && klasaId && canAddRegularG1Cell && canPrzydzielacWKomorce(plan.school_type ?? '', g, subject);
                              const klikPrzydzielG2 = trybPrzydzielGodzine && !trybPrzydzielGodzinyRozszerzen && klasaId && canAddRegularG2Cell && canPrzydzielacWKomorce(plan.school_type ?? '', g, subject);
                              const klikPrzydzielPonadprogramowaG1 = trybPrzydzielGodzine && !trybPrzydzielGodzinyRozszerzen && klasaId && !canAddRegularG1Cell && hoursToChoose > 0 && remainingDirectorHours > 0 && totalDirectorHours > 0 && canPrzydzielacWKomorce(plan.school_type ?? '', g, subject);
                              const klikPrzydzielPonadprogramowaG2 = trybPrzydzielGodzine && !trybPrzydzielGodzinyRozszerzen && klasaId && !canAddRegularG2Cell && hoursToChoose > 0 && remainingDirectorHours > 0 && totalDirectorHours > 0 && canPrzydzielacWKomorce(plan.school_type ?? '', g, subject);
                              const klikPrzydzielDyrektorG1 = trybPrzydzielDyrektor && klasaId && totalDirectorHours > 0 && remainingDirectorHours > 0 && canPrzydzielacWKomorce(plan.school_type ?? '', g, subject, true);
                              const klikPrzydzielDyrektorG2 = trybPrzydzielDyrektor && klasaId && totalDirectorHours > 0 && remainingDirectorHours > 0 && canPrzydzielacWKomorce(plan.school_type ?? '', g, subject, true);
                              const klikUsunG1 = trybUsunGodzine && (assignedG1Cell > 0 || dirG1Cell > 0);
                              const klikUsunG2 = trybUsunGodzine && (assignedG2Cell > 0 || dirG2Cell > 0);
                              const subCellBase = 'relative flex-1 min-h-[1.75rem] flex items-center justify-center gap-1 px-2 py-2 text-sm tabular-nums font-medium box-border transition-all duration-200 ease-out';
                              const subCellGr1Default = 'bg-gradient-to-b from-emerald-50/80 to-teal-50/60 border-b border-emerald-200/40';
                              const subCellGr2Default = 'bg-gradient-to-b from-violet-50/80 to-indigo-50/60 border-b border-violet-200/40';
                              const subCellBgPonadprogramowa = (klikPrzydzielPonadprogramowaG1 || klikPrzydzielPonadprogramowaG2 || klikPrzydzielDyrektorG1 || klikPrzydzielDyrektorG2) ? 'bg-gradient-to-b from-sky-100 to-blue-100 ring-2 ring-sky-400/70 shadow-inner' : '';
                              const subCellBgDyrektorskie = (n: number) =>
                                n <= 0 ? '' : (trybPrzydzielDyrektor ? 'bg-gradient-to-b from-sky-100 to-sky-200/90 ring-1 ring-sky-500/80 shadow-sm' : 'bg-gradient-to-b from-sky-50 to-sky-100/80 ring-1 ring-sky-400/60');
                              const subCellBgUsun = (maZawartosc: boolean) => (trybUsunGodzine && maZawartosc ? 'bg-red-50/90 ring-1 ring-red-300/60' : '');
                              const subCellHover = (klik: boolean, usun: boolean, ponadprogramowa?: boolean) => (klik ? (ponadprogramowa ? 'cursor-pointer hover:brightness-110 hover:ring-sky-500 hover:shadow-md' : 'cursor-pointer hover:brightness-95 hover:shadow-inner hover:ring-2 hover:ring-emerald-300/50') : usun ? 'cursor-pointer hover:bg-red-200/80 hover:ring-2 hover:ring-red-400/70' : kafelekKlikalnyPodzial ? 'cursor-pointer hover:brightness-95' : '');
                              return (
                                <td
                                  key={g}
                                  className={`${cellTallClass} border-r border-gray-100 w-14 sm:w-16 align-top p-1 sm:p-1.5 ${cellPodzialClass}`}
                                  onContextMenu={kafelekKlikalnyPodzial ? (e) => { e.preventDefault(); togglePodzialNaGrupy(subKey, g, { hoursToChoose: hoursToChoose ?? 0, grades, tylkoDyrektorskie: !canPrzydzielacWKomorce(plan.school_type ?? '', g, subject) }); } : undefined}
                                  style={{ minHeight: '3.5rem' }}
                                >
                                  <div className={`flex flex-col h-full min-h-[3.5rem] gap-px rounded-lg overflow-hidden ${tylkoDyrektorskieWTejKomorce ? 'bg-sky-50/60 ring-1 ring-dashed ring-sky-400/50' : 'bg-gray-100/50'}`} style={{ height: '100%' }}>
                                    <div
                                      className={`${subCellBase} first:rounded-t-lg ${!subCellBgPonadprogramowa && !(dirG1Cell > 0) ? subCellGr1Default : ''} ${subCellBgPonadprogramowa} ${dirG1Cell > 0 ? subCellBgDyrektorskie(dirG1Cell) : ''} ${subCellBgUsun(assignedG1Cell > 0 || dirG1Cell > 0)} ${subCellHover(!!(klikPrzydzielG1 || klikPrzydzielPonadprogramowaG1 || klikPrzydzielDyrektorG1), !!klikUsunG1, !!(klikPrzydzielPonadprogramowaG1 || klikPrzydzielDyrektorG1))}`}
                                      style={{ flex: '1 1 50%' }}
                                      onClick={
                                        klikPrzydzielG1 ? () => przydzielGodzine(subKey, g, hoursToChoose, 1)
                                        : klikPrzydzielPonadprogramowaG1 ? () => setModalPonadprogramowaGrupy({ subKey, grade: g, subjectName: subject })
                                        : klikPrzydzielDyrektorG1 ? () => dodajGodzineDyrektorskaGrupyObie(subKey, g)
                                        : klikUsunG1 ? () => (dirG1Cell > 0 ? usunGodzineDyrektorskaGrupy(subKey, g, 1) : cofnijGodzine(subKey, g, 1))
                                        : kafelekKlikalnyPodzial ? () => togglePodzialNaGrupy(subKey, g, { hoursToChoose: hoursToChoose ?? 0, grades, tylkoDyrektorskie: !canPrzydzielacWKomorce(plan.school_type ?? '', g, subject) }) : undefined
                                      }
                                      onContextMenu={(e) => {
                                        if ((dirG1Cell > 0 && !trybPrzydzielGodzine) || (assignedG1Cell > 0 && !trybPrzydzielDyrektor)) {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          if (dirG1Cell > 0 && (trybPrzydzielDyrektor || trybUsunGodzine)) {
                                            usunGodzineDyrektorskaGrupy(subKey, g, 1);
                                          } else if (assignedG1Cell > 0 && (trybPrzydzielGodzine || trybUsunGodzine)) {
                                            cofnijGodzine(subKey, g, 1);
                                          }
                                        }
                                      }}
                                      role={klikPrzydzielG1 || klikPrzydzielPonadprogramowaG1 || klikPrzydzielDyrektorG1 || klikUsunG1 || kafelekKlikalnyPodzial ? 'button' : undefined}
                                      title={
                                        kafelekKlikalnyPodzial ? (tylkoDyrektorskieWTejKomorce ? 'Tylko godz. dyrektorskie; wyłącz podział: prawy przycisk' : 'Wyłącz podział (prawy przycisk)') :
                                        klikPrzydzielG1 ? 'Dodaj 1 h (gr. 1); prawy: usuń' :
                                        klikPrzydzielPonadprogramowaG1 || klikPrzydzielDyrektorG1 ? (tylkoDyrektorskieWTejKomorce ? 'Przedmiot kończy się w kl. IV – tylko godz. dyrektorskie; dodaj 1 h dyrektorską (obie grupy +1)' : 'Dodaj 1 h dyrektorską (obie grupy +1); prawy: usuń') :
                                        klikUsunG1 ? 'Usuń 1 h (gr. 1)' :
                                        dirG1Cell > 0 ? `${dirG1Cell} godz. dyrektorsk${dirG1Cell === 1 ? 'a' : 'ich'} · ${subject} · klasa ${g}${tylkoDyrektorskieWTejKomorce ? ' (tylko dyrektorskie)' : ''}${trybPrzydzielDyrektor || trybUsunGodzine ? '; prawy: usuń' : ''}` :
                                        assignedG1Cell > 0 ? 'Prawy przycisk: usuń 1 h (gr. 1)' :
                                        tylkoDyrektorskieWTejKomorce ? 'Przedmiot kończy się w kl. IV – tylko godz. dyrektorskie; tryb „Godz. dyrektorskie” aby dodać' : undefined
                                      }
                                    >
                                      {klasaId ? (totalG1Cell > 0 ? String(totalG1Cell) : '0') : (base + dirH > 0 ? String(base + dirH) : '–')}
                                    </div>
                                    <div
                                      className={`${subCellBase} last:rounded-b-lg ${!subCellBgPonadprogramowa && !(dirG2Cell > 0) ? subCellGr2Default : ''} ${subCellBgPonadprogramowa} ${dirG2Cell > 0 ? subCellBgDyrektorskie(dirG2Cell) : ''} ${subCellBgUsun(assignedG2Cell > 0 || dirG2Cell > 0)} ${subCellHover(!!(klikPrzydzielG2 || klikPrzydzielPonadprogramowaG2 || klikPrzydzielDyrektorG2), !!klikUsunG2, !!(klikPrzydzielPonadprogramowaG2 || klikPrzydzielDyrektorG2))}`}
                                      style={{ flex: '1 1 50%' }}
                                      onClick={
                                        klikPrzydzielG2 ? () => przydzielGodzine(subKey, g, hoursToChoose, 2)
                                        : klikPrzydzielPonadprogramowaG2 ? () => setModalPonadprogramowaGrupy({ subKey, grade: g, subjectName: subject })
                                        : klikPrzydzielDyrektorG2 ? () => dodajGodzineDyrektorskaGrupyObie(subKey, g)
                                        : klikUsunG2 ? () => (dirG2Cell > 0 ? usunGodzineDyrektorskaGrupy(subKey, g, 2) : cofnijGodzine(subKey, g, 2))
                                        : kafelekKlikalnyPodzial ? () => togglePodzialNaGrupy(subKey, g, { hoursToChoose: hoursToChoose ?? 0, grades, tylkoDyrektorskie: !canPrzydzielacWKomorce(plan.school_type ?? '', g, subject) }) : undefined
                                      }
                                      onContextMenu={(e) => {
                                        if ((dirG2Cell > 0 && !trybPrzydzielGodzine) || (assignedG2Cell > 0 && !trybPrzydzielDyrektor)) {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          if (dirG2Cell > 0 && (trybPrzydzielDyrektor || trybUsunGodzine)) {
                                            usunGodzineDyrektorskaGrupy(subKey, g, 2);
                                          } else if (assignedG2Cell > 0 && (trybPrzydzielGodzine || trybUsunGodzine)) {
                                            cofnijGodzine(subKey, g, 2);
                                          }
                                        }
                                      }}
                                      role={klikPrzydzielG2 || klikPrzydzielPonadprogramowaG2 || klikPrzydzielDyrektorG2 || klikUsunG2 || kafelekKlikalnyPodzial ? 'button' : undefined}
                                      title={
                                        kafelekKlikalnyPodzial ? (tylkoDyrektorskieWTejKomorce ? 'Tylko godz. dyrektorskie; wyłącz podział: prawy przycisk' : 'Wyłącz podział (prawy przycisk)') :
                                        klikPrzydzielG2 ? 'Dodaj 1 h (gr. 2); prawy: usuń' :
                                        klikPrzydzielPonadprogramowaG2 || klikPrzydzielDyrektorG2 ? (tylkoDyrektorskieWTejKomorce ? 'Przedmiot kończy się w kl. IV – tylko godz. dyrektorskie; dodaj 1 h dyrektorską (obie grupy +1)' : 'Dodaj 1 h dyrektorską (obie grupy +1); prawy: usuń') :
                                        klikUsunG2 ? 'Usuń 1 h (gr. 2)' :
                                        dirG2Cell > 0 ? `${dirG2Cell} godz. dyrektorsk${dirG2Cell === 1 ? 'a' : 'ich'} · ${subject} · klasa ${g}${tylkoDyrektorskieWTejKomorce ? ' (tylko dyrektorskie)' : ''}${trybPrzydzielDyrektor || trybUsunGodzine ? '; prawy: usuń' : ''}` :
                                        assignedG2Cell > 0 ? 'Prawy przycisk: usuń 1 h (gr. 2)' :
                                        tylkoDyrektorskieWTejKomorce ? 'Przedmiot kończy się w kl. IV – tylko godz. dyrektorskie; tryb „Godz. dyrektorskie” aby dodać' : undefined
                                      }
                                    >
                                      {klasaId ? (totalG2Cell > 0 ? String(totalG2Cell) : '0') : (base + dirH > 0 ? String(base + dirH) : '–')}
                                    </div>
                                  </div>
                                </td>
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
                            /** Tło + obramówka dla komórek z godzinami dyrektorskimi. W trybie dyrektorskim – mocniejsze podświetlenie (przedmiot, klasa). */
                            const bgGodzinyDyrektorskie =
                              maGodzinyDyrektorskie && !maPonadprogramowe && !maNadgodzinyDyrektorWKomorce
                                ? trybPrzydzielDyrektor
                                  ? 'bg-gradient-to-b from-sky-100 to-sky-200 ring-2 ring-sky-500/80 rounded-lg shadow-sm'
                                  : 'bg-gradient-to-b from-sky-50 to-sky-100 ring-2 ring-sky-400/60 rounded-lg'
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
                            /** W wierszach „przedmioty o zakresie rozszerzonym” – te same kolory co w kolumnie Zrealizowane godziny (assigned z base) */
                            const bgZrealizowaneRozszerzony =
                              czyRozszerzony && klasaId && base > 0 && !kafelekKlikalny
                                ? assigned > base
                                  ? 'bg-blue-200 ring-1 ring-blue-400 rounded'
                                  : assigned === base
                                    ? 'bg-green-200 ring-1 ring-green-500 rounded'
                                    : base - assigned === 1
                                      ? 'bg-amber-200 ring-1 ring-amber-500 rounded'
                                      : 'bg-red-200 ring-1 ring-red-500 rounded'
                                : '';
                            const textZrealizowaneRozszerzony =
                              czyRozszerzony && klasaId && base > 0 && !kafelekKlikalny
                                ? assigned > base
                                  ? 'text-blue-900 font-semibold'
                                  : assigned === base
                                    ? 'text-green-900 font-semibold'
                                    : base - assigned === 1
                                      ? 'text-amber-900 font-semibold'
                                      : 'text-red-900 font-semibold'
                                : '';
                            const trybDodawaniaGodzin = trybPrzydzielGodzine || trybPrzydzielDyrektor || trybPrzydzielGodzinyRozszerzen;
                            const maCoUsunac = (czyRozszerzony || nazwaPogrubiona) && (extendedAssignedByGrade[g] ?? 0) > 0 || (dirH > 0 && !trybPrzydzielGodzine) || (assigned > 0 && !trybPrzydzielDyrektor);
                            const onContextMenuUsun = trybDodawaniaGodzin && !tylkoOdczyt && maCoUsunac
                              ? (e: React.MouseEvent) => {
                                  e.preventDefault();
                                  if ((czyRozszerzony || nazwaPogrubiona) && (extendedAssignedByGrade[g] ?? 0) > 0) {
                                    cofnijGodzineRozszerzen(g, planIdPrefix, nazwaPogrubiona ? subKey : undefined);
                                  } else if (dirH > 0 && !trybPrzydzielGodzine) {
                                    usunGodzineDyrektorska(subKey, g);
                                  } else if (assigned > 0) {
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
                                    ? () => togglePodzialNaGrupy(subKey, g, { hoursToChoose: hoursToChoose ?? 0, grades, tylkoDyrektorskie: !canPrzydzielacWKomorce(plan.school_type ?? '', g, subject) })
                                    : kafelekKlikalnyGodziny
                                    ? () => {
                                        if (trybPrzydzielGodzinyRozszerzen && klikalneRozszerzeniaThis) {
                                          setExtendedCellsAdded((prev) => new Set(prev).add(`${subKey}_${g}`));
                                          dodajGodzineRozszerzen(subKey, g);
                                        } else if (remaining > 0) {
                                          przydzielGodzine(subKey, g);
                                        } else if (remainingDirectorHours > 0 && totalDirectorHours > 0) {
                                          setModalPonadprogramowa({ subKey, grade: g, subjectName: subject });
                                        }
                                      }
                                    : kafelekKlikalnyDyrektor
                                      ? () => dodajGodzineDyrektorska(subKey, g, totalDirectorHours, plan.plan_id)
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
                                    ? podzialNaGrupy[subKey]?.[g] ? 'Kliknij, aby wyłączyć podział na grupy' : (!canPrzydzielacWKomorce(plan.school_type ?? '', g, subject) ? 'Kliknij, aby podzielić na grupy 1 i 2 (tylko godz. dyrektorskie – przedmiot kończy się w kl. IV)' : 'Kliknij, aby podzielić na grupy 1 i 2 (połowa | połowa)')
                                    : kafelekKlikalnyGodziny
                                    ? trybPrzydzielGodzinyRozszerzen && klikalneRozszerzeniaThis
                                      ? 'Kliknij, aby dodać 1 godzinę rozszerzeń (prawy przycisk: usuń)'
                                      : remaining > 0
                                        ? 'Kliknij, aby dodać 1 godzinę do wyboru (prawy przycisk: usuń)'
                                        : 'Kliknij, aby dodać godzinę ponadprogramową (po potwierdzeniu)'
                                    : kafelekKlikalnyDyrektor
                                      ? remainingDirectorHours > 0
                                        ? 'Kliknij, aby dodać 1 godzinę dyrektorską (prawy przycisk: usuń)'
                                        : 'Kliknij, aby dodać godzinę dyrektorską ponad pulę (po potwierdzeniu)'
                                      : kafelekKlikalnyUsun
                                        ? 'Kliknij, aby usunąć 1 godzinę (najpierw dyrektorską, potem do wyboru)'
                                        : maCoUsunac && trybDodawaniaGodzin
                                          ? 'Prawy przycisk: usuń 1 godzinę'
                                        : maPonadprogramowe
                                          ? 'Godziny ponadprogramowe'
                                          : maNadgodzinyDyrektorWKomorce
                                            ? 'Nadgodziny dyrektorskie'
                                            : maGodzinyDyrektorskie
                                              ? `${dirH} godz. dyrektorsk${dirH === 1 ? 'a' : 'ich'} · ${subject} · klasa ${g}${trybPrzydzielDyrektor || trybUsunGodzine ? '; prawy: usuń' : ''}`
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
                                    ? (base > 0 ? (
                                        <>
                                          {assigned} z {base}
                                          {base - assigned > 0 && (
                                            <span className="block text-xs opacity-90 mt-0.5 tabular-nums">
                                              {base - assigned} do przydziału
                                            </span>
                                          )}
                                        </>
                                      ) : '–')
                                    : cellDisplayTotal > 0
                                      ? podzialWlaczony
                                        ? (() => {
                                            const h1 = Math.floor(cellDisplayTotal / 2);
                                            const h2 = cellDisplayTotal - h1;
                                            return <>{h1} | {h2}</>;
                                          })()
                                        : cellDisplayTotal
                                      : '–'}
                                </span>
                              </td>
                            );
                          })}
                        <td className={`px-2 sm:px-3 ${cellTallClass} text-right tabular-nums font-medium text-gray-800 border-r border-gray-100 min-w-[5rem] sm:min-w-[6rem] w-24 sm:w-28 align-top ${obramowanieRozszerzony}`}>
                          {rowHasPodzial ? (
                            <span className="block text-xs tabular-nums" title="Grupa 1 / Grupa 2">
                              <span className="block">{totalG1}</span>
                              <span className="block border-t border-gray-200 mt-0.5 pt-0.5">{totalG2}</span>
                            </span>
                          ) : klasaId && hasGrades ? (
                            <>
                              <span className="tabular-nums">{razemRzeczywiste}</span>
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
                          className={`px-2 sm:px-3 ${cellTallClass} text-right border-l border-gray-200 w-20 sm:w-24 text-xs sm:text-sm align-top ${obramowanieRozszerzony} ${czyRozszerzony ? 'border-r-2 border-r-gray-400' : ''} ${
                            rowHasPodzial
                              ? 'bg-gradient-to-r from-gray-50/50 to-white'
                              : klasaId && (row.hours_to_choose != null && row.hours_to_choose > 0 || godzinyRozszerzenia > 0 || (czyRozszerzony && planoweGodziny > 0))
                                ? displayedAssigned > displayedTotal
                                  ? 'bg-blue-200 font-semibold text-blue-900 ring-1 ring-blue-400 rounded'
                                  : displayedAssigned === displayedTotal
                                    ? 'bg-green-200 font-semibold text-green-900 ring-1 ring-green-500 rounded'
                                    : displayedRemaining === 1
                                      ? 'bg-amber-200 font-semibold text-amber-900 ring-1 ring-amber-500 rounded'
                                      : displayedRemaining > 0
                                        ? 'bg-red-200 font-semibold text-red-900 ring-1 ring-red-500 rounded'
                                        : ''
                                : ''
                          }`}
                        >
                          {rowHasPodzial ? (
                            <span className="inline-flex flex-col gap-1" title="Łącznie gr. 1 / Łącznie gr. 2 (zajęcia łączone wliczane do obu)">
                              <span className="inline-flex flex-col gap-0.5 rounded-lg overflow-hidden border border-gray-200/80 bg-white/60 p-1.5 shadow-sm">
                                <span className="flex items-center justify-center rounded-md bg-gradient-to-r from-emerald-50 to-teal-50 px-2 py-1 text-xs font-semibold tabular-nums text-emerald-800 border border-emerald-200/50">
                                  {totalG1} z {planRegular}
                                </span>
                                <span className="flex items-center justify-center rounded-md bg-gradient-to-r from-violet-50 to-indigo-50 px-2 py-1 text-xs font-semibold tabular-nums text-violet-800 border border-violet-200/50">
                                  {totalG2} z {planRegular}
                                </span>
                              </span>
                            </span>
                          ) : row.hours_to_choose != null || godzinyRozszerzenia > 0 || (czyRozszerzony && planoweGodziny > 0) ? (
                            klasaId ? (
                              <span className="tabular-nums">
                                {displayedAssigned} z {displayedTotal}
                                {nazwaPogrubiona && extendedPoolSize > 0 && (
                                  <span className="block text-xs opacity-90 mt-0.5">z czego {extendedPoolSize} rozszerzeń</span>
                                )}
                                {displayedRemaining > 0 && (
                                  <span className="block text-xs opacity-90 mt-0.5">
                                    {displayedRemaining} do przydziału
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

      {/* Modal: czy dodać godzinę ponadprogramową (dodaje jako dyrektorską) */}
      {modalPonadprogramowa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Godziny ponadprogramowe</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Wszystkie godziny programowe są przydzielone. Czy chcesz dodać godzinę dyrektorską do przedmiotu „{modalPonadprogramowa.subjectName}"?
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
                  dodajGodzineDyrektorska(modalPonadprogramowa.subKey, modalPonadprogramowa.grade);
                  setModalPonadprogramowa(null);
                }}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Tak, dodaj (godzina dyrektorska)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: czy dodać godzinę ponadplanową (dyrektorską) dla grupy – obie grupy +1 */}
      {modalPonadprogramowaGrupy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Godziny ponadplanowe</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Pula godzin jest wyczerpana. Czy chcesz dodać godzinę dyrektorską (obie grupy +1) do przedmiotu „{modalPonadprogramowaGrupy.subjectName}"?
            </p>
            <div className="flex flex-row gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalPonadprogramowaGrupy(null)}
                className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
              >
                Nie
              </button>
              <button
                type="button"
                onClick={() => {
                  dodajGodzineDyrektorskaGrupyObie(modalPonadprogramowaGrupy.subKey, modalPonadprogramowaGrupy.grade);
                  setModalPonadprogramowaGrupy(null);
                }}
                className="px-4 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium"
              >
                Tak, dodaj (obie grupy +1)
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
