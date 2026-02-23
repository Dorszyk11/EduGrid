/**
 * MEiN Compliance Service — PURE domain function.
 *
 * Ported from: src/utils/zgodnoscMein.ts → obliczZgodnoscMein()
 *
 * Calculates compliance between school's planned hours and MEiN requirements.
 * ZERO framework/DB imports. Takes pre-loaded data as arguments.
 */

import { type ComplianceStatus } from "@/shared/types";

export interface ComplianceInput {
  readonly subjectId: string;
  readonly subjectName: string;
  readonly schoolTypeId: string;
  readonly schoolTypeName: string;
  readonly classId: string;
  readonly className: string;
  readonly classNumber: number | null;
  readonly requiredCycleHours: number;
  readonly requiredWeeklyMin: number | null;
  readonly requiredWeeklyMax: number | null;
  readonly isMandatory: boolean;
  readonly meinClassNumber: number | null;
  readonly actualAnnualHours: number;
  readonly actualCycleHours: number;
  readonly actualWeeklyAverage: number;
}

export interface ComplianceResult {
  readonly subjectId: string;
  readonly subjectName: string;
  readonly schoolTypeId: string;
  readonly schoolTypeName: string;
  readonly classId: string;
  readonly className: string;
  readonly classNumber: number | null;
  readonly required: {
    readonly cycleHours: number;
    readonly weeklyMin: number | null;
    readonly weeklyMax: number | null;
    readonly isMandatory: boolean;
    readonly classNumber: number | null;
  };
  readonly actual: {
    readonly annualHours: number;
    readonly cycleHours: number;
    readonly weeklyAverage: number;
  };
  readonly difference: {
    readonly hours: number;
    readonly realizationPercent: number;
  };
  readonly status: ComplianceStatus;
  readonly alerts: string[];
}

/**
 * Calculate compliance for a single subject-class combination.
 *
 * PARITY: matches old obliczZgodnoscMein() calculation logic exactly.
 * - difference = actual - required (negative = shortage, positive = surplus)
 * - percent = (actual / required) * 100
 * - status: OK | BRAK | NADWYZKA | BRAK_DANYCH
 */
export function calculateCompliance(input: ComplianceInput): ComplianceResult {
  const required = input.requiredCycleHours;
  const actual = input.actualCycleHours;
  const difference = actual - required;
  const realizationPercent = required > 0 ? (actual / required) * 100 : 0;

  let status: ComplianceStatus;
  const alerts: string[] = [];

  if (required === 0) {
    status = "BRAK_DANYCH";
    alerts.push("Brak wymagań MEiN dla tego przedmiotu");
  } else if (difference < 0) {
    status = "BRAK";
    alerts.push(
      `Brakuje ${Math.abs(difference)} godzin (${Math.abs(realizationPercent - 100).toFixed(1)}% poniżej wymaganego minimum)`,
    );
  } else if (difference > 0) {
    status = "NADWYZKA";
    alerts.push(
      `Nadwyżka ${difference} godzin (${(realizationPercent - 100).toFixed(1)}% powyżej wymaganego minimum)`,
    );
  } else {
    status = "OK";
  }

  // Check weekly hours bounds
  if (
    input.requiredWeeklyMin !== null &&
    input.actualWeeklyAverage < input.requiredWeeklyMin
  ) {
    alerts.push(
      `Godziny tygodniowo (${input.actualWeeklyAverage}) poniżej minimum (${input.requiredWeeklyMin})`,
    );
  }

  if (
    input.requiredWeeklyMax !== null &&
    input.actualWeeklyAverage > input.requiredWeeklyMax
  ) {
    alerts.push(
      `Godziny tygodniowo (${input.actualWeeklyAverage}) powyżej maksimum (${input.requiredWeeklyMax})`,
    );
  }

  return {
    subjectId: input.subjectId,
    subjectName: input.subjectName,
    schoolTypeId: input.schoolTypeId,
    schoolTypeName: input.schoolTypeName,
    classId: input.classId,
    className: input.className,
    classNumber: input.classNumber,
    required: {
      cycleHours: required,
      weeklyMin: input.requiredWeeklyMin,
      weeklyMax: input.requiredWeeklyMax,
      isMandatory: input.isMandatory,
      classNumber: input.meinClassNumber,
    },
    actual: {
      annualHours: input.actualAnnualHours,
      cycleHours: actual,
      weeklyAverage: input.actualWeeklyAverage,
    },
    difference: {
      hours: difference,
      realizationPercent,
    },
    status,
    alerts,
  };
}

/**
 * Calculate compliance for multiple inputs (batch).
 */
export function calculateComplianceBatch(
  inputs: readonly ComplianceInput[],
): ComplianceResult[] {
  return inputs.map(calculateCompliance);
}

/**
 * Format compliance result as text.
 * PARITY: matches old formatujWynikZgodnosci().
 */
export function formatComplianceResult(result: ComplianceResult): string {
  const lines: string[] = [];

  lines.push(`Przedmiot: ${result.subjectName}`);
  lines.push(`Klasa: ${result.className || "Wszystkie klasy"}`);
  lines.push(`Typ szkoły: ${result.schoolTypeName}`);
  lines.push("");
  lines.push(`Wymagane MEiN: ${result.required.cycleHours} godzin w cyklu`);
  lines.push(`Realizowane: ${result.actual.cycleHours} godzin w cyklu`);
  lines.push(
    `Różnica: ${result.difference.hours > 0 ? "+" : ""}${result.difference.hours} godzin`,
  );
  lines.push(
    `Procent realizacji: ${result.difference.realizationPercent.toFixed(1)}%`,
  );
  lines.push(`Status: ${result.status}`);

  if (result.alerts.length > 0) {
    lines.push("");
    lines.push("Alerty:");
    for (const alert of result.alerts) {
      lines.push(`  - ${alert}`);
    }
  }

  return lines.join("\n");
}
