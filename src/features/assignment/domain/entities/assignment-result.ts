/**
 * Assignment Result — output of the distribution algorithm.
 * Pure domain entity, no framework dependencies.
 */

export interface Assignment {
  readonly taskId: string;
  readonly subjectId: string;
  readonly subjectName: string;
  readonly classId: string;
  readonly className: string;
  readonly teacherId: string;
  readonly teacherName: string;
  readonly weeklyHours: number;
  readonly annualHours: number;
  readonly reason: string;
  readonly priority: number;
}

export interface StaffingGap {
  readonly taskId: string;
  readonly subjectId: string;
  readonly subjectName: string;
  readonly classId: string;
  readonly className: string;
  readonly weeklyHours: number;
  readonly reason: string;
  readonly availableTeachersCount: number;
  readonly suggestedSolutions: string[];
}

export interface WorkloadStatistics {
  readonly teacherId: string;
  readonly teacherName: string;
  readonly maxWorkload: number;
  readonly workloadBefore: number;
  readonly workloadAfter: number;
  readonly difference: number;
  readonly utilizationPercent: number;
  readonly assignmentCount: number;
}

export interface AssignmentMetrics {
  readonly totalTasks: number;
  readonly successfulAssignments: number;
  readonly failedAssignments: number;
  readonly averageWorkload: number;
  readonly standardDeviation: number;
  readonly balanceCoefficient: number;
}

export interface AssignmentResult {
  readonly assignments: Assignment[];
  readonly staffingGaps: StaffingGap[];
  readonly workloadStatistics: WorkloadStatistics[];
  readonly metrics: AssignmentMetrics;
  readonly warnings: string[];
}
