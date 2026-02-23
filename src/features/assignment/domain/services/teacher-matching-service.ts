/**
 * Teacher Matching Service — PURE domain function.
 *
 * Ported from: src/utils/przypisywanieNauczycieli.ts → znajdzDostepnychNauczycieli()
 *
 * Finds and ranks available teachers for a given subject.
 * Zero framework/DB imports. Fully deterministic.
 */

import { type TeacherAvailability } from "@/features/assignment/domain/entities";

export interface TeacherMatchingOptions {
  readonly requireQualifications: boolean;
  readonly minimumWorkload: number;
  readonly preferred: string[];
  readonly excluded: string[];
}

/**
 * Filter and rank available teachers by availability and preferences.
 * Returns teachers sorted by: preferred first, then by available workload descending.
 *
 * PARITY: Matches old znajdzDostepnychNauczycieli() sorting behavior.
 */
export function rankAvailableTeachers(
  allTeachers: readonly TeacherAvailability[],
  options: TeacherMatchingOptions,
): TeacherAvailability[] {
  const filtered: TeacherAvailability[] = [];

  for (const teacher of allTeachers) {
    if (options.excluded.includes(teacher.teacherId)) {
      continue;
    }

    if (options.requireQualifications && !teacher.hasQualifications) {
      continue;
    }

    if (teacher.availableWorkload < options.minimumWorkload) {
      continue;
    }

    filtered.push(teacher);
  }

  // Sort: preferred first, then by available workload descending
  filtered.sort((a, b) => {
    const aPreferred = options.preferred.includes(a.teacherId) ? 1 : 0;
    const bPreferred = options.preferred.includes(b.teacherId) ? 1 : 0;

    if (aPreferred !== bPreferred) {
      return bPreferred - aPreferred;
    }

    return b.availableWorkload - a.availableWorkload;
  });

  return filtered;
}
