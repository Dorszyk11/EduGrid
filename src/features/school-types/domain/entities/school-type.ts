/**
 * SchoolType entity — pure domain.
 */

export interface SchoolType {
  readonly id: string;
  readonly name: string;
  readonly cycleYears: number;
  readonly meinCode: string;
}
