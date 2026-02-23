/**
 * Hour Allocation Service — PURE domain function.
 *
 * Ported from: src/app/api/przydzial/generuj/route.ts → uzupełnijNierozdysponowane()
 *
 * Distributes unassigned elective hours optimally across grades in a cycle.
 * ZERO framework imports. Deterministic.
 */

import { type HoursByGrade } from "@/features/assignment/domain/entities";

/**
 * Fills unassigned hours (hours-to-choose) across grades in a cycle.
 *
 * Strategy: distribute remaining hours evenly across grades,
 * starting from the first grade with the fewest hours assigned.
 *
 * PARITY: Matches old uzupełnijNierozdysponowane() behavior.
 *
 * @param totalHoursToChoose - Total hours to distribute for a subject
 * @param currentAllocation - Current hours already assigned per grade
 * @param grades - Ordered list of grade labels (e.g., ["I","II","III","IV"])
 * @returns Updated allocation per grade
 */
export function fillUnassignedHours(
  totalHoursToChoose: number,
  currentAllocation: HoursByGrade,
  grades: readonly string[],
): HoursByGrade {
  if (grades.length === 0 || totalHoursToChoose <= 0) {
    return { ...currentAllocation };
  }

  const result: HoursByGrade = {};
  for (const g of grades) {
    result[g] = currentAllocation[g] ?? 0;
  }

  const currentTotal = Object.values(result).reduce((sum, v) => sum + v, 0);
  let remaining = totalHoursToChoose - currentTotal;

  if (remaining <= 0) {
    return result;
  }

  // Distribute remaining hours one-by-one to the grade with fewest hours
  while (remaining > 0) {
    // Find grade with minimum hours
    let minGrade = grades[0];
    let minHours = result[minGrade] ?? 0;

    for (const g of grades) {
      const hours = result[g] ?? 0;
      if (hours < minHours) {
        minHours = hours;
        minGrade = g;
      }
    }

    const increment = Math.min(1, remaining);
    result[minGrade] = (result[minGrade] ?? 0) + increment;
    remaining -= increment;
  }

  return result;
}
