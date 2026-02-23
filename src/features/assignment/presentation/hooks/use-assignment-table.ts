"use client";

import { useReducer, useCallback, useEffect, useRef } from "react";
import {
  type ClassAssignmentState,
  type CellAction,
  type MeinPlan,
  type PlanSummary,
} from "../types";
import {
  assignmentReducer,
  createEmptyAssignmentState,
} from "./assignment-reducer";

interface UseAssignmentTableOptions {
  classId: string | null;
  plans: MeinPlan[];
  onAssignmentChange?: () => void;
}

export function useAssignmentTable({
  classId,
  plans,
  onAssignmentChange,
}: UseAssignmentTableOptions) {
  const [state, dispatch] = useReducer(
    assignmentReducer,
    classId ?? "",
    createEmptyAssignmentState,
  );
  const isLoadingRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load assignment state from API when classId changes
  useEffect(() => {
    if (!classId) {
      dispatch({ type: "load", state: createEmptyAssignmentState("") });
      return;
    }

    let cancelled = false;
    isLoadingRef.current = true;

    fetch(`/api/assignment-state?classId=${encodeURIComponent(classId)}`, {
      cache: "no-store",
    })
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error("fetch failed")),
      )
      .then((data: Partial<ClassAssignmentState>) => {
        if (cancelled) return;
        dispatch({
          type: "load",
          state: {
            classId,
            assigned: data.assigned ?? {},
            directorAssigned: data.directorAssigned ?? {},
            extensionAssigned: data.extensionAssigned ?? {},
            groupSplit: data.groupSplit ?? {},
            groupAssigned: data.groupAssigned ?? {},
            extensionSubjectKeys: new Set(data.extensionSubjectKeys ?? []),
            counselingRealized: data.counselingRealized ?? {},
          },
        });
      })
      .catch(() => {
        if (cancelled) return;
        dispatch({ type: "load", state: createEmptyAssignmentState(classId) });
      })
      .finally(() => {
        if (!cancelled) isLoadingRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [classId]);

  // Auto-save with debounce
  const saveToApi = useCallback((stateToSave: ClassAssignmentState) => {
    if (!stateToSave.classId) return;
    fetch("/api/assignment-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...stateToSave,
        extensionSubjectKeys: Array.from(stateToSave.extensionSubjectKeys),
      }),
    }).catch((err) => console.error("Save assignment state failed:", err));
  }, []);

  const handleAction = useCallback(
    (action: CellAction) => {
      dispatch(action);
      onAssignmentChange?.();
      // Debounced save
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        // We need the latest state — reducer has already updated
        // This works because the timeout fires after React processes the dispatch
      }, 500);
    },
    [onAssignmentChange],
  );

  // Save whenever state changes (debounced)
  useEffect(() => {
    if (!state.classId || isLoadingRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveToApi(state), 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [state, saveToApi]);

  // Compute plan summaries
  const computeSummary = useCallback(
    (plan: MeinPlan): PlanSummary => {
      const totalByGrade: Record<string, number> = {};
      const assignedByGrade: Record<string, number> = {};
      const directorByGrade: Record<string, number> = {};
      const extensionByGrade: Record<string, number> = {};
      let hoursToChooseTotal = 0;
      let assignedTotal = 0;
      let directorAssignedTotal = 0;
      let extensionAssignedTotal = 0;
      let extensionPoolSize = 0;

      plan.grades.forEach((g) => {
        totalByGrade[g] = 0;
        assignedByGrade[g] = 0;
        directorByGrade[g] = 0;
        extensionByGrade[g] = 0;
      });

      plan.subjects.forEach((row) => {
        if (row.isCycleTotalSubject) return;
        const subKey = `${plan.planId}_${row.subject}`;
        hoursToChooseTotal += row.hoursToChoose;

        if (row.isExtendedRow) {
          extensionPoolSize = row.totalHours;
        }

        plan.grades.forEach((g) => {
          const base = row.hoursByGrade[g] ?? 0;
          const assigned = state.assigned[subKey]?.[g] ?? 0;
          const dir = state.directorAssigned[subKey]?.[g] ?? 0;
          const ext = state.extensionAssigned[subKey]?.[g] ?? 0;

          totalByGrade[g] += base + assigned + dir + ext;
          assignedByGrade[g] += assigned;
          directorByGrade[g] += dir;
          extensionByGrade[g] += ext;

          assignedTotal += assigned;
          directorAssignedTotal += dir;
          extensionAssignedTotal += ext;
        });
      });

      const grandTotal = Object.values(totalByGrade).reduce((a, b) => a + b, 0);

      return {
        totalByGrade,
        assignedByGrade,
        directorByGrade,
        extensionByGrade,
        grandTotal,
        hoursToChooseTotal,
        assignedTotal,
        directorAssignedTotal,
        directorAvailable: plan.directorHours,
        extensionAssignedTotal,
        extensionPoolSize,
      };
    },
    [state],
  );

  const summaries = plans.map(computeSummary);

  return {
    state,
    dispatch: handleAction,
    summaries,
    isLoading: isLoadingRef.current,
  };
}
