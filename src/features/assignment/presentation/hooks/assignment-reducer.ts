import { type ClassAssignmentState, type CellAction } from "../types";

type AssignmentReducerAction =
  | CellAction
  | { type: "load"; state: ClassAssignmentState };

/**
 * Pure reducer for ClassAssignmentState. All mutations go through here,
 * making state changes testable and predictable.
 */
export function assignmentReducer(
  state: ClassAssignmentState,
  action: AssignmentReducerAction,
): ClassAssignmentState {
  switch (action.type) {
    case "load":
      return action.state;

    case "assign": {
      const { subKey, grade, group } = action;
      if (group === 1 || group === 2) {
        const bySubject = state.groupAssigned[subKey] ?? {};
        const current = bySubject[grade] ?? { g1: 0, g2: 0 };
        const key = group === 1 ? "g1" : "g2";
        return {
          ...state,
          groupAssigned: {
            ...state.groupAssigned,
            [subKey]: {
              ...bySubject,
              [grade]: { ...current, [key]: current[key] + 1 },
            },
          },
        };
      }
      const bySubject = state.assigned[subKey] ?? {};
      return {
        ...state,
        assigned: {
          ...state.assigned,
          [subKey]: { ...bySubject, [grade]: (bySubject[grade] ?? 0) + 1 },
        },
      };
    }

    case "unassign": {
      const { subKey, grade, group } = action;
      if (group === 1 || group === 2) {
        const bySubject = state.groupAssigned[subKey] ?? {};
        const current = bySubject[grade] ?? { g1: 0, g2: 0 };
        const key = group === 1 ? "g1" : "g2";
        const newVal = Math.max(0, current[key] - 1);
        return {
          ...state,
          groupAssigned: {
            ...state.groupAssigned,
            [subKey]: {
              ...bySubject,
              [grade]: { ...current, [key]: newVal },
            },
          },
        };
      }
      const bySubject = state.assigned[subKey] ?? {};
      const current = bySubject[grade] ?? 0;
      if (current <= 0) return state;
      const next = current - 1;
      const updated = { ...bySubject };
      if (next === 0) {
        delete updated[grade];
      } else {
        updated[grade] = next;
      }
      return {
        ...state,
        assigned: { ...state.assigned, [subKey]: updated },
      };
    }

    case "assign-director": {
      const { subKey, grade } = action;
      const bySubject = state.directorAssigned[subKey] ?? {};
      return {
        ...state,
        directorAssigned: {
          ...state.directorAssigned,
          [subKey]: { ...bySubject, [grade]: (bySubject[grade] ?? 0) + 1 },
        },
      };
    }

    case "unassign-director": {
      const { subKey, grade } = action;
      const bySubject = state.directorAssigned[subKey] ?? {};
      const current = bySubject[grade] ?? 0;
      if (current <= 0) return state;
      const next = current - 1;
      const updated = { ...bySubject };
      if (next === 0) {
        delete updated[grade];
      } else {
        updated[grade] = next;
      }
      return {
        ...state,
        directorAssigned: { ...state.directorAssigned, [subKey]: updated },
      };
    }

    case "assign-extension": {
      const { subKey, grade } = action;
      const bySubject = state.extensionAssigned[subKey] ?? {};
      return {
        ...state,
        extensionAssigned: {
          ...state.extensionAssigned,
          [subKey]: { ...bySubject, [grade]: (bySubject[grade] ?? 0) + 1 },
        },
      };
    }

    case "unassign-extension": {
      const { subKey, grade } = action;
      const bySubject = state.extensionAssigned[subKey] ?? {};
      const current = bySubject[grade] ?? 0;
      if (current <= 0) return state;
      const next = current - 1;
      const updated = { ...bySubject };
      if (next === 0) {
        delete updated[grade];
      } else {
        updated[grade] = next;
      }
      return {
        ...state,
        extensionAssigned: { ...state.extensionAssigned, [subKey]: updated },
      };
    }

    case "toggle-group-split": {
      const { subKey, grade } = action;
      const bySubject = state.groupSplit[subKey] ?? {};
      const wasEnabled = bySubject[grade] ?? false;
      const nextGroupSplit = {
        ...state.groupSplit,
        [subKey]: { ...bySubject, [grade]: !wasEnabled },
      };

      if (!wasEnabled) {
        // Enabling split: migrate current assigned hours to groups
        const currentHours = state.assigned[subKey]?.[grade] ?? 0;
        const g1 = Math.floor(currentHours / 2);
        const g2 = currentHours - g1;
        const bySubjectGroups = state.groupAssigned[subKey] ?? {};
        const nextGroupAssigned = {
          ...state.groupAssigned,
          [subKey]: { ...bySubjectGroups, [grade]: { g1, g2 } },
        };
        // Remove from flat assigned
        const bySubjectAssigned = { ...state.assigned[subKey] };
        delete bySubjectAssigned[grade];
        return {
          ...state,
          groupSplit: nextGroupSplit,
          groupAssigned: nextGroupAssigned,
          assigned: { ...state.assigned, [subKey]: bySubjectAssigned },
        };
      } else {
        // Disabling split: sum groups back into flat assigned
        const groups = state.groupAssigned[subKey]?.[grade];
        const sum = (groups?.g1 ?? 0) + (groups?.g2 ?? 0);
        const bySubjectGroups = { ...(state.groupAssigned[subKey] ?? {}) };
        delete bySubjectGroups[grade];
        const nextAssigned =
          sum > 0
            ? {
                ...state.assigned,
                [subKey]: { ...(state.assigned[subKey] ?? {}), [grade]: sum },
              }
            : state.assigned;
        return {
          ...state,
          groupSplit: nextGroupSplit,
          groupAssigned: { ...state.groupAssigned, [subKey]: bySubjectGroups },
          assigned: nextAssigned,
        };
      }
    }

    case "toggle-extension-subject": {
      const { subKey } = action;
      const next = new Set(state.extensionSubjectKeys);
      if (next.has(subKey)) {
        next.delete(subKey);
        // Remove extension hours for this subject
        const nextExt = { ...state.extensionAssigned };
        delete nextExt[subKey];
        return {
          ...state,
          extensionSubjectKeys: next,
          extensionAssigned: nextExt,
        };
      } else {
        next.add(subKey);
        return { ...state, extensionSubjectKeys: next };
      }
    }

    case "assign-counseling": {
      const { key, grade, maxHours } = action;
      const bySubject = state.counselingRealized[key] ?? {};
      const totalRealized = Object.values(bySubject).reduce((a, b) => a + b, 0);
      if (totalRealized >= maxHours) return state;
      return {
        ...state,
        counselingRealized: {
          ...state.counselingRealized,
          [key]: { ...bySubject, [grade]: (bySubject[grade] ?? 0) + 1 },
        },
      };
    }

    case "unassign-counseling": {
      const { key, grade } = action;
      const bySubject = state.counselingRealized[key] ?? {};
      const current = bySubject[grade] ?? 0;
      if (current <= 0) return state;
      const updated = { ...bySubject };
      if (current - 1 === 0) {
        delete updated[grade];
      } else {
        updated[grade] = current - 1;
      }
      return {
        ...state,
        counselingRealized: { ...state.counselingRealized, [key]: updated },
      };
    }

    default:
      return state;
  }
}

export function createEmptyAssignmentState(
  classId: string,
): ClassAssignmentState {
  return {
    classId,
    assigned: {},
    directorAssigned: {},
    extensionAssigned: {},
    groupSplit: {},
    groupAssigned: {},
    extensionSubjectKeys: new Set(),
    counselingRealized: {},
  };
}
