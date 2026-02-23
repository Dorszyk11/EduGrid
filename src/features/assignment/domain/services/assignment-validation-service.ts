/**
 * Assignment Validation Service — PURE domain function.
 *
 * Ported from: src/utils/przypisywanieNauczycieli.ts → walidujPrzypisanie()
 *
 * Validates an assignment before saving.
 * ZERO framework/DB imports.
 */

export interface AssignmentValidationInput {
  readonly teacherMaxWorkload: number;
  readonly teacherCurrentWorkload: number;
  readonly teacherIsActive: boolean;
  readonly teacherHasQualifications: boolean;
  readonly hoursToAssign: number;
}

export interface AssignmentValidationResult {
  readonly isValid: boolean;
  readonly problems: string[];
  readonly warnings: string[];
}

export function validateAssignment(
  input: AssignmentValidationInput,
): AssignmentValidationResult {
  const problems: string[] = [];
  const warnings: string[] = [];

  if (!input.teacherIsActive) {
    problems.push("Nauczyciel nie jest aktywny");
  }

  if (!input.teacherHasQualifications) {
    problems.push("Nauczyciel nie ma kwalifikacji do tego przedmiotu");
  }

  const newWorkload = input.teacherCurrentWorkload + input.hoursToAssign;

  if (newWorkload > input.teacherMaxWorkload) {
    problems.push(
      `Przypisanie spowoduje przekroczenie maksymalnego obciążenia (${newWorkload} > ${input.teacherMaxWorkload})`,
    );
  } else if (newWorkload === input.teacherMaxWorkload) {
    warnings.push("Nauczyciel osiągnie maksymalne obciążenie");
  }

  return {
    isValid: problems.length === 0,
    problems,
    warnings,
  };
}
