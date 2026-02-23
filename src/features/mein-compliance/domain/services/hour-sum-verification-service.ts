/**
 * Hour Sum Verification Service — PURE domain function.
 *
 * Ported from: src/utils/weryfikacjaSum.ts → weryfikujSumyGodzin()
 *
 * Verifies that hours in the schedule match MEiN requirements.
 * ZERO framework/DB imports. Takes pre-loaded data.
 */

export interface HourSumEntry {
  readonly subjectName: string;
  readonly className: string;
  readonly expectedHours: number;
  readonly actualHours: number;
}

export interface HourSumVerificationResult {
  readonly isCorrect: boolean;
  readonly expectedTotal: number;
  readonly actualTotal: number;
  readonly difference: number;
  readonly details: Array<{
    readonly subject: string;
    readonly className: string;
    readonly expected: number;
    readonly actual: number;
    readonly difference: number;
  }>;
  readonly errors: string[];
}

/**
 * Verify hour sums.
 *
 * PARITY: tolerance of 0.1h, same error messages as old weryfikujSumyGodzin().
 */
export function verifyHourSums(
  entries: readonly HourSumEntry[],
): HourSumVerificationResult {
  const details: HourSumVerificationResult["details"] = [];
  const errors: string[] = [];
  let expectedTotal = 0;
  let actualTotal = 0;

  for (const entry of entries) {
    const diff = entry.actualHours - entry.expectedHours;
    expectedTotal += entry.expectedHours;
    actualTotal += entry.actualHours;

    details.push({
      subject: entry.subjectName,
      className: entry.className,
      expected: entry.expectedHours,
      actual: entry.actualHours,
      difference: diff,
    });

    if (Math.abs(diff) > 0.1) {
      if (diff < 0) {
        errors.push(
          `Brak ${Math.abs(diff).toFixed(1)}h dla ${entry.subjectName} w ${entry.className}`,
        );
      } else {
        errors.push(
          `Nadwyżka ${diff.toFixed(1)}h dla ${entry.subjectName} w ${entry.className}`,
        );
      }
    }
  }

  const totalDiff = actualTotal - expectedTotal;
  const isCorrect = Math.abs(totalDiff) < 0.1 && errors.length === 0;

  return {
    isCorrect,
    expectedTotal,
    actualTotal,
    difference: totalDiff,
    details,
    errors,
  };
}
