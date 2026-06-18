import { useEffect, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { cacheSet } from '@/lib/przydzial/tabelaHelpers';
import type { PrzydzialGrupyByGrade } from '@/lib/przydzial/typy';
import type { useGroupSplit } from '@/hooks/useGroupSplit';

export const STORAGE_PREFIX = 'przydzial-wyboru-';
export const STORAGE_DORADZTWO = 'zrealizowane-doradztwo-';
export const STORAGE_DYREKTOR = 'dyrektor-godziny-';

type GroupSplit = ReturnType<typeof useGroupSplit>;
type Mapa = Record<string, Record<string, number>>;

export interface UseDaneKlasyParams {
  klasaId: string | undefined;
  refetchTrigger: number | undefined;
  onPrzydzialChange?: () => void;
  onDoradztwoChange?: () => void;
  groupSplit: GroupSplit;
  przydzial: Mapa;
  setPrzydzial: Dispatch<SetStateAction<Mapa>>;
  zrealizowaneDoradztwo: Mapa;
  setZrealizowaneDoradztwo: Dispatch<SetStateAction<Mapa>>;
  dyrektor: Mapa;
  setDyrektor: Dispatch<SetStateAction<Mapa>>;
  rozszerzeniaSubKeys: Set<string>;
  setRozszerzeniaSubKeys: Dispatch<SetStateAction<Set<string>>>;
  rozszerzeniaPrzydzial: Mapa;
  setRozszerzeniaPrzydzial: Dispatch<SetStateAction<Mapa>>;
  setExtendedPoolByGradeLegacy: Dispatch<SetStateAction<Record<string, number>>>;
  setExtendedCellsAdded: Dispatch<SetStateAction<Set<string>>>;
  setLadowanieZapis: Dispatch<SetStateAction<boolean>>;
}

/**
 * Stan-pochodne dane klasy: efekt ladowania z API (+ fallback localStorage) oraz
 * wszystkie callbacki zapisu/akcji. Wydzielone 1:1 z PlanMeinTabela (SP3 Krok 5).
 * STAN useState i useGroupSplit/groupSaveRef ZOSTAJA w rodzicu (sztywny kontrakt) —
 * tu sa tylko domkniecia nad stanem przekazanym w parametrach.
 */
export function useDaneKlasy({
  klasaId, refetchTrigger, onPrzydzialChange, onDoradztwoChange, groupSplit,
  przydzial, setPrzydzial, zrealizowaneDoradztwo, setZrealizowaneDoradztwo, dyrektor, setDyrektor,
  rozszerzeniaSubKeys, setRozszerzeniaSubKeys, rozszerzeniaPrzydzial, setRozszerzeniaPrzydzial,
  setExtendedPoolByGradeLegacy, setExtendedCellsAdded, setLadowanieZapis,
}: UseDaneKlasyParams) {
  const { przydzialGrupy, przydzialGrupyDyrektor, setPodzialNaGrupy, setPrzydzialGrupy, setPrzydzialGrupyDyrektor, setPrzydzialGrupyRozszerzenia } = groupSplit;

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
        cacheSet(STORAGE_PREFIX + klasaId, p);
        cacheSet(STORAGE_DORADZTWO + klasaId, d);
        cacheSet(STORAGE_DYREKTOR + klasaId, dy);
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
    // settery stanu są stabilne tożsamościowo (React) – dodane dla zgodności z react-hooks/exhaustive-deps
  }, [klasaId, refetchTrigger, setPodzialNaGrupy, setPrzydzialGrupy, setPrzydzialGrupyDyrektor, setPrzydzialGrupyRozszerzenia, setPrzydzial, setZrealizowaneDoradztwo, setDyrektor, setRozszerzeniaSubKeys, setRozszerzeniaPrzydzial, setExtendedPoolByGradeLegacy, setExtendedCellsAdded, setLadowanieZapis]);

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

  const zapiszPrzydzial = useCallback(
    (next: Record<string, Record<string, number>>) => {
      if (!klasaId) return;
      setPrzydzial(next);
      cacheSet(STORAGE_PREFIX + klasaId, next);
      onPrzydzialChange?.();
      zapiszDoBazy(next, zrealizowaneDoradztwo, dyrektor, undefined, przydzialGrupy);
    },
    [klasaId, onPrzydzialChange, zrealizowaneDoradztwo, dyrektor, zapiszDoBazy, przydzialGrupy, setPrzydzial]
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
      cacheSet(STORAGE_DORADZTWO + klasaId, next);
      onDoradztwoChange?.();
      zapiszDoBazy(przydzial, next, dyrektor);
    },
    [klasaId, onDoradztwoChange, przydzial, dyrektor, zapiszDoBazy, setZrealizowaneDoradztwo]
  );

  const zapiszDyrektor = useCallback(
    (next: Record<string, Record<string, number>>) => {
      if (!klasaId) return;
      setDyrektor(next);
      cacheSet(STORAGE_DYREKTOR + klasaId, next);
      onPrzydzialChange?.();
      zapiszDoBazy(przydzial, zrealizowaneDoradztwo, next);
    },
    [klasaId, onPrzydzialChange, przydzial, zrealizowaneDoradztwo, zapiszDoBazy, setDyrektor]
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
    [rozszerzeniaPrzydzial, przydzial, zrealizowaneDoradztwo, dyrektor, zapiszDoBazy, onPrzydzialChange, setRozszerzeniaPrzydzial]
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
    [rozszerzeniaPrzydzial, rozszerzeniaSubKeys, przydzial, zrealizowaneDoradztwo, dyrektor, zapiszDoBazy, onPrzydzialChange, setExtendedCellsAdded, setRozszerzeniaPrzydzial]
  );


  return {
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
  };
}
