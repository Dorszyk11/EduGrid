import { useState, useCallback } from 'react';

export type GroupHours = { 1: number; 2: number };
export type GroupSplitFlags = Record<string, Record<string, boolean>>;
export type GroupAssignments = Record<string, Record<string, GroupHours>>;

interface UseGroupSplitOptions {
  klasaId: string | undefined;
  przydzial: Record<string, Record<string, number>>;
  setPrzydzial: (next: Record<string, Record<string, number>>) => void;
  onSave: (
    przydzial: Record<string, Record<string, number>>,
    grupy: GroupAssignments,
    podzial: GroupSplitFlags,
    grupyDyrektor: GroupAssignments,
    grupyRozszerzenia: GroupAssignments,
  ) => void;
  onChange?: () => void;
}

interface UseGroupSplitReturn {
  podzialNaGrupy: GroupSplitFlags;
  przydzialGrupy: GroupAssignments;
  przydzialGrupyDyrektor: GroupAssignments;
  przydzialGrupyRozszerzenia: GroupAssignments;
  setPodzialNaGrupy: (v: GroupSplitFlags) => void;
  setPrzydzialGrupy: (v: GroupAssignments) => void;
  setPrzydzialGrupyDyrektor: (v: GroupAssignments) => void;
  setPrzydzialGrupyRozszerzenia: (v: GroupAssignments) => void;
  toggleSplit: (subKey: string, grade: string) => void;
  isSplit: (subKey: string, grade: string) => boolean;
  getGroupHours: (subKey: string, grade: string) => GroupHours;
  addHourToGroup: (subKey: string, grade: string, group: 1 | 2) => void;
  addHourToBothGroups: (subKey: string, grade: string) => void;
  removeHourFromGroup: (subKey: string, grade: string, group: 1 | 2) => void;
  removeHourFromBothGroups: (subKey: string, grade: string) => void;
  getAssignedForGroup: (subKey: string, grade: string, group: 1 | 2) => number;
  addDirectorHourToGroup: (subKey: string, grade: string, group: 1 | 2) => void;
  addDirectorHourToBothGroups: (subKey: string, grade: string) => void;
  removeDirectorHourFromGroup: (subKey: string, grade: string, group: 1 | 2) => void;
  removeDirectorHourFromBothGroups: (subKey: string, grade: string) => void;
  getDirectorForGroup: (subKey: string, grade: string, group: 1 | 2) => number;
  addExtensionHourToGroup: (subKey: string, grade: string, group: 1 | 2) => void;
  addExtensionHourToBothGroups: (subKey: string, grade: string) => void;
  removeExtensionHourFromGroup: (subKey: string, grade: string, group: 1 | 2) => void;
  removeExtensionHourFromBothGroups: (subKey: string, grade: string) => void;
  getExtensionForGroup: (subKey: string, grade: string, group: 1 | 2) => number;
  rowHasAnySplit: (subKey: string, grades: string[]) => boolean;
  computeGroupSums: (
    subKey: string,
    grades: string[],
    totalByGrade: Record<string, number>,
    assignedByGrade: Record<string, number>,
    directorByGrade: Record<string, number>
  ) => { sumH1: number; sumH2: number; assignedG1: number; assignedG2: number };
}

function removeKey<T>(obj: Record<string, T>, key: string): Record<string, T> {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}

function cleanRecord(obj: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v != null && v > 0)
  ) as Record<string, number>;
}

function addHourGeneric(
  assignments: GroupAssignments,
  subKey: string,
  grade: string,
  group: 1 | 2,
): GroupAssignments {
  const bySub = assignments[subKey] ?? {};
  const byGrade = bySub[grade] ?? { 1: 0, 2: 0 };
  const nextByGrade = { ...byGrade, [group]: (byGrade[group] ?? 0) + 1 };
  return { ...assignments, [subKey]: { ...bySub, [grade]: nextByGrade } };
}

function removeHourGeneric(
  assignments: GroupAssignments,
  subKey: string,
  grade: string,
  group: 1 | 2,
): GroupAssignments | null {
  const bySub = assignments[subKey] ?? {};
  const byGrade = bySub[grade] ?? { 1: 0, 2: 0 };
  const current = byGrade[group] ?? 0;
  if (current <= 0) return null;
  const nextByGrade: GroupHours = { ...byGrade, [group]: current - 1 };
  const sum = (nextByGrade[1] ?? 0) + (nextByGrade[2] ?? 0);
  const nextBySub = sum === 0 ? removeKey(bySub, grade) : { ...bySub, [grade]: nextByGrade };
  return Object.keys(nextBySub).length === 0
    ? removeKey(assignments, subKey)
    : { ...assignments, [subKey]: nextBySub };
}

function getForGroup(
  assignments: GroupAssignments,
  subKey: string,
  grade: string,
  group: 1 | 2,
): number {
  const gr = assignments[subKey]?.[grade];
  return gr ? (gr[group] ?? 0) : 0;
}

export function useGroupSplit({
  klasaId,
  przydzial,
  setPrzydzial,
  onSave,
  onChange,
}: UseGroupSplitOptions): UseGroupSplitReturn {
  const [podzialNaGrupy, setPodzialNaGrupy] = useState<GroupSplitFlags>({});
  const [przydzialGrupy, setPrzydzialGrupy] = useState<GroupAssignments>({});
  const [przydzialGrupyDyrektor, setPrzydzialGrupyDyrektor] = useState<GroupAssignments>({});
  const [przydzialGrupyRozszerzenia, setPrzydzialGrupyRozszerzenia] = useState<GroupAssignments>({});

  const isSplit = useCallback(
    (subKey: string, grade: string) => podzialNaGrupy[subKey]?.[grade] === true,
    [podzialNaGrupy]
  );

  const getGroupHours = useCallback(
    (subKey: string, grade: string): GroupHours =>
      przydzialGrupy[subKey]?.[grade] ?? { 1: 0, 2: 0 },
    [przydzialGrupy]
  );

  const getAssignedForGroup = useCallback(
    (subKey: string, grade: string, group: 1 | 2): number => {
      const gr = przydzialGrupy[subKey]?.[grade];
      if (gr && (gr[1] + gr[2]) > 0) return gr[group];
      return przydzial[subKey]?.[grade] ?? 0;
    },
    [przydzialGrupy, przydzial]
  );

  const getDirectorForGroup = useCallback(
    (subKey: string, grade: string, group: 1 | 2): number =>
      getForGroup(przydzialGrupyDyrektor, subKey, grade, group),
    [przydzialGrupyDyrektor]
  );

  const getExtensionForGroup = useCallback(
    (subKey: string, grade: string, group: 1 | 2): number =>
      getForGroup(przydzialGrupyRozszerzenia, subKey, grade, group),
    [przydzialGrupyRozszerzenia]
  );

  const save = useCallback(
    (
      p: Record<string, Record<string, number>>,
      g: GroupAssignments,
      pd: GroupSplitFlags,
      gd?: GroupAssignments,
      gr?: GroupAssignments,
    ) => {
      onSave(
        p,
        g,
        pd,
        gd ?? przydzialGrupyDyrektor,
        gr ?? przydzialGrupyRozszerzenia,
      );
    },
    [onSave, przydzialGrupyDyrektor, przydzialGrupyRozszerzenia]
  );

  const toggleSplit = useCallback(
    (subKey: string, grade: string) => {
      if (!klasaId) return;

      const bySub = podzialNaGrupy[subKey] ?? {};
      const enabling = !bySub[grade];
      const nextPodzial: GroupSplitFlags = {
        ...podzialNaGrupy,
        [subKey]: { ...bySub, [grade]: enabling },
      };
      setPodzialNaGrupy(nextPodzial);

      let nextPrzydzial = przydzial;
      let nextGrupy = przydzialGrupy;
      let nextGrupyDir = przydzialGrupyDyrektor;
      let nextGrupyExt = przydzialGrupyRozszerzenia;

      if (enabling) {
        const current = (przydzial[subKey] ?? {})[grade] ?? 0;
        nextGrupy = {
          ...przydzialGrupy,
          [subKey]: { ...(przydzialGrupy[subKey] ?? {}), [grade]: { 1: current, 2: current } },
        };
        setPrzydzialGrupy(nextGrupy);

        if (current > 0) {
          const { [grade]: _, ...rest } = przydzial[subKey] ?? {};
          nextPrzydzial = { ...przydzial, [subKey]: rest };
          setPrzydzial(nextPrzydzial);
        }
      } else {
        const gr = przydzialGrupy[subKey]?.[grade];
        const sum = Math.max(gr?.[1] ?? 0, gr?.[2] ?? 0);

        const bySubGrupy = przydzialGrupy[subKey] ?? {};
        const { [grade]: _, ...restByGrade } = bySubGrupy;
        nextGrupy = Object.keys(restByGrade).length === 0
          ? removeKey(przydzialGrupy, subKey)
          : { ...przydzialGrupy, [subKey]: restByGrade };
        setPrzydzialGrupy(nextGrupy);

        if (sum > 0) {
          nextPrzydzial = {
            ...przydzial,
            [subKey]: { ...(przydzial[subKey] ?? {}), [grade]: sum },
          };
          setPrzydzial(nextPrzydzial);
        }

        const dirGr = przydzialGrupyDyrektor[subKey]?.[grade];
        if (dirGr) {
          const bySubDir = przydzialGrupyDyrektor[subKey] ?? {};
          const { [grade]: __, ...restDir } = bySubDir;
          nextGrupyDir = Object.keys(restDir).length === 0
            ? removeKey(przydzialGrupyDyrektor, subKey)
            : { ...przydzialGrupyDyrektor, [subKey]: restDir };
          setPrzydzialGrupyDyrektor(nextGrupyDir);
        }

        const extGr = przydzialGrupyRozszerzenia[subKey]?.[grade];
        if (extGr) {
          const bySubExt = przydzialGrupyRozszerzenia[subKey] ?? {};
          const { [grade]: ___, ...restExt } = bySubExt;
          nextGrupyExt = Object.keys(restExt).length === 0
            ? removeKey(przydzialGrupyRozszerzenia, subKey)
            : { ...przydzialGrupyRozszerzenia, [subKey]: restExt };
          setPrzydzialGrupyRozszerzenia(nextGrupyExt);
        }
      }

      onChange?.();
      onSave(nextPrzydzial, nextGrupy, nextPodzial, nextGrupyDir, nextGrupyExt);
    },
    [klasaId, podzialNaGrupy, przydzial, przydzialGrupy, przydzialGrupyDyrektor, przydzialGrupyRozszerzenia, setPrzydzial, onSave, onChange]
  );

  const addHourToGroup = useCallback(
    (subKey: string, grade: string, group: 1 | 2) => {
      if (!podzialNaGrupy[subKey]?.[grade]) return;
      const next = addHourGeneric(przydzialGrupy, subKey, grade, group);
      setPrzydzialGrupy(next);
      onChange?.();
      save(przydzial, next, podzialNaGrupy);
    },
    [przydzialGrupy, podzialNaGrupy, przydzial, save, onChange]
  );

  const addHourToBothGroups = useCallback(
    (subKey: string, grade: string) => {
      if (!podzialNaGrupy[subKey]?.[grade]) return;
      const step1 = addHourGeneric(przydzialGrupy, subKey, grade, 1);
      const next = addHourGeneric(step1, subKey, grade, 2);
      setPrzydzialGrupy(next);
      onChange?.();
      save(przydzial, next, podzialNaGrupy);
    },
    [przydzialGrupy, podzialNaGrupy, przydzial, save, onChange]
  );

  const removeHourFromBothGroups = useCallback(
    (subKey: string, grade: string) => {
      if (!podzialNaGrupy[subKey]?.[grade]) return;
      const step1 = removeHourGeneric(przydzialGrupy, subKey, grade, 1);
      if (!step1) return;
      const next = removeHourGeneric(step1, subKey, grade, 2);
      if (!next) return;
      setPrzydzialGrupy(next);
      onChange?.();
      save(przydzial, next, podzialNaGrupy);
    },
    [przydzialGrupy, podzialNaGrupy, przydzial, save, onChange]
  );

  const removeHourFromGroup = useCallback(
    (subKey: string, grade: string, group: 1 | 2) => {
      if (!podzialNaGrupy[subKey]?.[grade]) return;

      const bySub = przydzialGrupy[subKey] ?? {};
      const byGrade = bySub[grade] ?? { 1: 0, 2: 0 };
      const current = byGrade[group] ?? 0;

      if (current <= 0) {
        const oldAssigned = przydzial[subKey]?.[grade] ?? 0;
        if (oldAssigned > 0) {
          const bySubject = przydzial[subKey] ?? {};
          const nextVal = oldAssigned - 1;
          const nextBySubject = nextVal === 0
            ? removeKey(bySubject, grade)
            : { ...bySubject, [grade]: nextVal };
          const cleaned = cleanRecord(nextBySubject);
          const nextPrzydzial = { ...przydzial, [subKey]: cleaned };
          setPrzydzial(nextPrzydzial);
          onChange?.();
          save(nextPrzydzial, przydzialGrupy, podzialNaGrupy);
        }
        return;
      }

      const result = removeHourGeneric(przydzialGrupy, subKey, grade, group);
      if (!result) return;
      setPrzydzialGrupy(result);
      onChange?.();
      save(przydzial, result, podzialNaGrupy);
    },
    [przydzialGrupy, podzialNaGrupy, przydzial, setPrzydzial, save, onChange]
  );

  const addDirectorHourToGroup = useCallback(
    (subKey: string, grade: string, group: 1 | 2) => {
      if (!podzialNaGrupy[subKey]?.[grade]) return;
      const next = addHourGeneric(przydzialGrupyDyrektor, subKey, grade, group);
      setPrzydzialGrupyDyrektor(next);
      onChange?.();
      save(przydzial, przydzialGrupy, podzialNaGrupy, next, undefined);
    },
    [przydzialGrupyDyrektor, podzialNaGrupy, przydzial, przydzialGrupy, save, onChange]
  );

  const addDirectorHourToBothGroups = useCallback(
    (subKey: string, grade: string) => {
      if (!podzialNaGrupy[subKey]?.[grade]) return;
      const step1 = addHourGeneric(przydzialGrupyDyrektor, subKey, grade, 1);
      const next = addHourGeneric(step1, subKey, grade, 2);
      setPrzydzialGrupyDyrektor(next);
      onChange?.();
      save(przydzial, przydzialGrupy, podzialNaGrupy, next, undefined);
    },
    [przydzialGrupyDyrektor, podzialNaGrupy, przydzial, przydzialGrupy, save, onChange]
  );

  const removeDirectorHourFromGroup = useCallback(
    (subKey: string, grade: string, group: 1 | 2) => {
      if (!podzialNaGrupy[subKey]?.[grade]) return;
      const result = removeHourGeneric(przydzialGrupyDyrektor, subKey, grade, group);
      if (!result) return;
      setPrzydzialGrupyDyrektor(result);
      onChange?.();
      save(przydzial, przydzialGrupy, podzialNaGrupy, result, undefined);
    },
    [przydzialGrupyDyrektor, podzialNaGrupy, przydzial, przydzialGrupy, save, onChange]
  );

  const removeDirectorHourFromBothGroups = useCallback(
    (subKey: string, grade: string) => {
      if (!podzialNaGrupy[subKey]?.[grade]) return;
      const step1 = removeHourGeneric(przydzialGrupyDyrektor, subKey, grade, 1);
      if (!step1) return;
      const next = removeHourGeneric(step1, subKey, grade, 2);
      if (!next) return;
      setPrzydzialGrupyDyrektor(next);
      onChange?.();
      save(przydzial, przydzialGrupy, podzialNaGrupy, next, undefined);
    },
    [przydzialGrupyDyrektor, podzialNaGrupy, przydzial, przydzialGrupy, save, onChange]
  );

  const addExtensionHourToGroup = useCallback(
    (subKey: string, grade: string, group: 1 | 2) => {
      if (!podzialNaGrupy[subKey]?.[grade]) return;
      const next = addHourGeneric(przydzialGrupyRozszerzenia, subKey, grade, group);
      setPrzydzialGrupyRozszerzenia(next);
      onChange?.();
      save(przydzial, przydzialGrupy, podzialNaGrupy, undefined, next);
    },
    [przydzialGrupyRozszerzenia, podzialNaGrupy, przydzial, przydzialGrupy, save, onChange]
  );

  const addExtensionHourToBothGroups = useCallback(
    (subKey: string, grade: string) => {
      if (!podzialNaGrupy[subKey]?.[grade]) return;
      const step1 = addHourGeneric(przydzialGrupyRozszerzenia, subKey, grade, 1);
      const next = addHourGeneric(step1, subKey, grade, 2);
      setPrzydzialGrupyRozszerzenia(next);
      onChange?.();
      save(przydzial, przydzialGrupy, podzialNaGrupy, undefined, next);
    },
    [przydzialGrupyRozszerzenia, podzialNaGrupy, przydzial, przydzialGrupy, save, onChange]
  );

  const removeExtensionHourFromGroup = useCallback(
    (subKey: string, grade: string, group: 1 | 2) => {
      if (!podzialNaGrupy[subKey]?.[grade]) return;
      const result = removeHourGeneric(przydzialGrupyRozszerzenia, subKey, grade, group);
      if (!result) return;
      setPrzydzialGrupyRozszerzenia(result);
      onChange?.();
      save(przydzial, przydzialGrupy, podzialNaGrupy, undefined, result);
    },
    [przydzialGrupyRozszerzenia, podzialNaGrupy, przydzial, przydzialGrupy, save, onChange]
  );

  const removeExtensionHourFromBothGroups = useCallback(
    (subKey: string, grade: string) => {
      if (!podzialNaGrupy[subKey]?.[grade]) return;
      const step1 = removeHourGeneric(przydzialGrupyRozszerzenia, subKey, grade, 1);
      if (!step1) return;
      const next = removeHourGeneric(step1, subKey, grade, 2);
      if (!next) return;
      setPrzydzialGrupyRozszerzenia(next);
      onChange?.();
      save(przydzial, przydzialGrupy, podzialNaGrupy, undefined, next);
    },
    [przydzialGrupyRozszerzenia, podzialNaGrupy, przydzial, przydzialGrupy, save, onChange]
  );

  const rowHasAnySplit = useCallback(
    (subKey: string, grades: string[]) =>
      grades.some((g) => podzialNaGrupy[subKey]?.[g] === true),
    [podzialNaGrupy]
  );

  const computeGroupSums = useCallback(
    (
      subKey: string,
      grades: string[],
      totalByGrade: Record<string, number>,
      assignedByGrade: Record<string, number>,
      _directorByGrade: Record<string, number>
    ) => {
      const sumH1 = grades.reduce((s, g) => s + (totalByGrade[g] ?? 0), 0);
      const sumH2 = sumH1;

      const computeForGroup = (group: 1 | 2) =>
        grades.reduce((s, g) => {
          if (podzialNaGrupy[subKey]?.[g] !== true) {
            return s + (assignedByGrade[g] ?? 0);
          }
          const gr = przydzialGrupy[subKey]?.[g];
          const hasGroupData = gr && (gr[1] + gr[2]) > 0;
          const fromGrupy = hasGroupData ? gr[group] : (przydzial[subKey]?.[g] ?? 0);
          return s + fromGrupy;
        }, 0);

      return {
        sumH1,
        sumH2,
        assignedG1: computeForGroup(1),
        assignedG2: computeForGroup(2),
      };
    },
    [podzialNaGrupy, przydzialGrupy, przydzial]
  );

  return {
    podzialNaGrupy,
    przydzialGrupy,
    przydzialGrupyDyrektor,
    przydzialGrupyRozszerzenia,
    setPodzialNaGrupy,
    setPrzydzialGrupy,
    setPrzydzialGrupyDyrektor,
    setPrzydzialGrupyRozszerzenia,
    toggleSplit,
    isSplit,
    getGroupHours,
    addHourToGroup,
    addHourToBothGroups,
    removeHourFromGroup,
    removeHourFromBothGroups,
    getAssignedForGroup,
    addDirectorHourToGroup,
    addDirectorHourToBothGroups,
    removeDirectorHourFromGroup,
    removeDirectorHourFromBothGroups,
    getDirectorForGroup,
    addExtensionHourToGroup,
    addExtensionHourToBothGroups,
    removeExtensionHourFromGroup,
    removeExtensionHourFromBothGroups,
    getExtensionForGroup,
    rowHasAnySplit,
    computeGroupSums,
  };
}
