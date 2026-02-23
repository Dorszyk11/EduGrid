/**
 * Risk Indicator Service — PURE domain function.
 *
 * Ported from: src/utils/wskaznikRyzyka.ts → obliczWskaznikRyzyka()
 *
 * Calculates a school's organizational risk score (0-100).
 * ZERO framework/DB imports. Takes pre-computed data.
 *
 * PARITY: same factor weights, category thresholds (0-25-50-75-100), recommendations.
 */

import { type RiskCategory, type ComplianceStatus } from "@/shared/types";

export interface RiskFactor {
  readonly name: string;
  readonly impact: number; // 0-100
  readonly description: string;
}

export interface RiskIndicatorResult {
  readonly value: number; // 0-100
  readonly category: RiskCategory;
  readonly factors: RiskFactor[];
  readonly recommendations: string[];
}

export interface RiskIndicatorInput {
  readonly complianceResults: ReadonlyArray<{ status: ComplianceStatus }>;
  readonly staffingGapCount: number;
  readonly staffingGapTotalHours: number;
  readonly teacherOverloads: readonly number[]; // array of overloaded hours per teacher
  readonly teacherUnderloads: readonly number[]; // array of underload % gap (50 - actual%)
  readonly totalTeacherCount: number;
  readonly totalClassCount: number;
  readonly classesWithoutAssignments: number;
}

/**
 * Calculate risk indicator.
 *
 * PARITY: Same factor calculations, same thresholds, same recommendations.
 */
export function calculateRiskIndicator(
  input: RiskIndicatorInput,
): RiskIndicatorResult {
  const factors: RiskFactor[] = [];
  const recommendations: string[] = [];

  // 1. MEiN compliance gaps
  const shortages = input.complianceResults.filter((r) => r.status === "BRAK");
  const totalCompliance = input.complianceResults.length;

  if (shortages.length > 0 && totalCompliance > 0) {
    const percentShortages = (shortages.length / totalCompliance) * 100;
    const impact = Math.min(100, percentShortages * 1.5);
    factors.push({
      name: "Braki zgodności z MEiN",
      impact: Math.round(impact),
      description: `${shortages.length} z ${totalCompliance} przedmiotów/klas ma braki godzin`,
    });

    if (impact > 50) {
      recommendations.push(
        "Pilnie uzupełnij braki godzin zgodnie z wymaganiami MEiN",
      );
    }
  }

  // 2. Staffing gaps
  if (input.staffingGapCount > 0) {
    const impact = Math.min(100, input.staffingGapTotalHours * 5);
    factors.push({
      name: "Braki kadrowe",
      impact: Math.round(impact),
      description: `${input.staffingGapCount} przedmiotów/klas bez nauczycieli (${input.staffingGapTotalHours}h/tyg)`,
    });

    if (impact > 30) {
      recommendations.push(
        `Zatrudnij ${Math.ceil(input.staffingGapTotalHours / 18)} nauczycieli (${input.staffingGapTotalHours}h/tyg)`,
      );
    }
  }

  // 3. Teacher overloads
  if (input.teacherOverloads.length > 0) {
    const avgOverload =
      input.teacherOverloads.reduce((s, o) => s + o, 0) /
      input.teacherOverloads.length;
    const impact = Math.min(
      60,
      input.teacherOverloads.length * 10 + avgOverload * 2,
    );
    factors.push({
      name: "Przekroczenia obciążeń",
      impact: Math.round(impact),
      description: `${input.teacherOverloads.length} nauczycieli przekroczyło maksymalne obciążenie (śr. ${avgOverload.toFixed(1)}h)`,
    });

    if (impact > 30) {
      recommendations.push(
        "Zredukuj obciążenia przekroczonych nauczycieli lub zatrudnij dodatkową kadrę",
      );
    }
  }

  // 4. Teacher underloads
  if (
    input.teacherUnderloads.length > 0 &&
    input.teacherUnderloads.length > input.totalTeacherCount * 0.2
  ) {
    const impact = Math.min(20, input.teacherUnderloads.length * 2);
    factors.push({
      name: "Niskie obciążenia",
      impact: Math.round(impact),
      description: `${input.teacherUnderloads.length} nauczycieli ma obciążenie poniżej 50%`,
    });

    if (impact > 10) {
      recommendations.push(
        "Rozważ zwiększenie obciążeń niedociążonych nauczycieli lub redukcję etatów",
      );
    }
  }

  // 5. Classes without assignments
  if (input.classesWithoutAssignments > 0 && input.totalClassCount > 0) {
    const percentUnassigned =
      (input.classesWithoutAssignments / input.totalClassCount) * 100;
    const impact = Math.min(80, percentUnassigned * 1.5);
    factors.push({
      name: "Klasy bez przypisań",
      impact: Math.round(impact),
      description: `${input.classesWithoutAssignments} z ${input.totalClassCount} klas nie ma żadnych przypisań`,
    });

    if (impact > 20) {
      recommendations.push("Przypisz nauczycieli do klas bez przypisań");
    }
  }

  // Calculate total risk value
  const totalImpact = factors.reduce((sum, f) => sum + f.impact, 0);
  const maxImpact = factors.length * 100;
  const value =
    maxImpact > 0 ? Math.min(100, (totalImpact / maxImpact) * 100) : 0;

  // Determine category (PARITY: same thresholds)
  let category: RiskCategory;
  if (value >= 75) {
    category = "krytyczny";
  } else if (value >= 50) {
    category = "wysoki";
  } else if (value >= 25) {
    category = "sredni";
  } else {
    category = "niski";
  }

  // Default recommendation
  if (recommendations.length === 0 && value > 0) {
    recommendations.push("Monitoruj sytuację i podejmij działania prewencyjne");
  }

  return {
    value: Math.round(value),
    category,
    factors,
    recommendations,
  };
}
