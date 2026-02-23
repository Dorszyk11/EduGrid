/**
 * Types for the MeinPlanTable component hierarchy.
 * Separates data shapes from rendering logic.
 */

export interface MeinPlan {
  planId: string;
  attachmentNo: string;
  schoolType: string;
  cycle: string;
  cycleShort?: string;
  scope?: string;
  grades: string[];
  unit?: string;
  sourcePages?: number[];
  subjects: MeinSubjectRow[];
  directorHours: number;
}

export interface MeinSubjectRow {
  lp?: number;
  subject: string;
  hoursByGrade: Record<string, number>;
  totalHours: number;
  hoursToChoose: number;
  rawValues?: Record<string, string>;
  isExtendedRow: boolean;
  isCycleTotalSubject: boolean;
}

/** Operational data for a single class's assignment state */
export interface ClassAssignmentState {
  classId: string;
  /** subjectKey → grade → hours */
  assigned: Record<string, Record<string, number>>;
  /** subjectKey → grade → hours (director discretionary) */
  directorAssigned: Record<string, Record<string, number>>;
  /** subjectKey → grade → hours (extended curriculum) */
  extensionAssigned: Record<string, Record<string, number>>;
  /** subjectKey → grade → boolean (split into 2 groups) */
  groupSplit: Record<string, Record<string, boolean>>;
  /** subjectKey → grade → { g1: number; g2: number } */
  groupAssigned: Record<string, Record<string, { g1: number; g2: number }>>;
  /** Set of subjectKeys marked as "extension" subjects */
  extensionSubjectKeys: Set<string>;
  /** Realized counseling hours: subjectKey → grade → hours */
  counselingRealized: Record<string, Record<string, number>>;
}

export type CellAction =
  | { type: "assign"; subKey: string; grade: string; group?: 1 | 2 }
  | { type: "unassign"; subKey: string; grade: string; group?: 1 | 2 }
  | { type: "assign-director"; subKey: string; grade: string }
  | { type: "unassign-director"; subKey: string; grade: string }
  | { type: "assign-extension"; subKey: string; grade: string }
  | { type: "unassign-extension"; subKey: string; grade: string }
  | { type: "toggle-group-split"; subKey: string; grade: string }
  | { type: "toggle-extension-subject"; subKey: string }
  | { type: "assign-counseling"; key: string; grade: string; maxHours: number }
  | { type: "unassign-counseling"; key: string; grade: string };

/** Computed per-cell data for rendering */
export interface CellComputedData {
  baseHours: number;
  assignedHours: number;
  directorHours: number;
  extensionHours: number;
  totalHours: number;
  isGroupSplit: boolean;
  group1Hours: number;
  group2Hours: number;
  canAssign: boolean;
  canAssignDirector: boolean;
  canAssignExtension: boolean;
  canRemove: boolean;
}

/** Summary row for bottom of each plan table */
export interface PlanSummary {
  totalByGrade: Record<string, number>;
  assignedByGrade: Record<string, number>;
  directorByGrade: Record<string, number>;
  extensionByGrade: Record<string, number>;
  grandTotal: number;
  hoursToChooseTotal: number;
  assignedTotal: number;
  directorAssignedTotal: number;
  directorAvailable: number;
  extensionAssignedTotal: number;
  extensionPoolSize: number;
}
