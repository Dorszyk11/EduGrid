/**
 * SchoolClass entity — pure domain.
 */

export interface SchoolClass {
  readonly id: string;
  readonly name: string;
  readonly schoolTypeId: string;
  readonly schoolYear: string;
  readonly classNumber: number | null;
  readonly profile: string | null;
  readonly profession: string | null;
  readonly isActive: boolean;
  readonly ownerId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Extract class number from name (e.g., "1A" → 1).
 * PARITY: matches old numer_klasy fallback logic.
 */
export function extractClassNumber(schoolClass: SchoolClass): number | null {
  if (schoolClass.classNumber !== null) {
    return schoolClass.classNumber;
  }
  const match = schoolClass.name.match(/^(\d+)/);
  if (match) {
    return Number(match[1]);
  }
  return null;
}
