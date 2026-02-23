/**
 * Assignment Service — PURE domain function.
 *
 * Ported from: src/utils/automatycznyRozdzialGodzin.ts → automatycznyRozdzialGodzin()
 *
 * This is the CRITICAL core of the application.
 * It distributes teaching hours across teachers using a greedy algorithm
 * with workload balancing, continuity preference, and qualification checking.
 *
 * ZERO framework imports. ZERO DB imports. Fully deterministic.
 * Given identical inputs → produces identical outputs.
 */

import {
  type AssignmentTask,
  type Assignment,
  type StaffingGap,
  type WorkloadStatistics,
  type AssignmentMetrics,
  type AssignmentResult,
  type TeacherAvailability,
} from "@/features/assignment/domain/entities";

export interface DistributionParams {
  readonly schoolYear: string;
  readonly requireQualifications: boolean;
  readonly maxOverload: number;
  readonly preferContinuity: boolean;
  readonly minimumWorkload: number;
}

/**
 * Main assignment distribution algorithm.
 *
 * PARITY with old automatycznyRozdzialGodzin():
 * 1. Tasks are processed in order (by classNumber ascending, no classNumber last)
 * 2. For each task, find available teachers (not excluded, within workload+overload limit)
 * 3. Sort candidate teachers by: continuity preference, then workload % ascending
 * 4. Pick the first (lowest workload %) teacher
 * 5. Track assignments and workloads in-memory
 * 6. Report staffing gaps for unassignable tasks
 * 7. Compute workload statistics and metrics
 *
 * @param tasks - Pre-ordered list of assignment tasks (classNumber ascending, then no classNumber)
 * @param teachersBySubject - Map of subjectId → available teachers for that subject
 * @param lockedTaskIds - Set of task IDs that are locked (already assigned, skip)
 * @param initialWorkloads - Map of teacherId → current weekly hours before algorithm
 * @param teacherMetadata - Map of teacherId → {name, maxWorkload} for stats
 * @param params - Distribution parameters
 */
export function distributeAssignments(
  tasks: readonly AssignmentTask[],
  teachersBySubject: ReadonlyMap<string, readonly TeacherAvailability[]>,
  lockedTaskIds: ReadonlySet<string>,
  initialWorkloads: ReadonlyMap<string, number>,
  teacherMetadata: ReadonlyMap<string, { name: string; maxWorkload: number }>,
  params: DistributionParams,
): AssignmentResult {
  const { maxOverload, preferContinuity } = params;

  const assignments: Assignment[] = [];
  const staffingGaps: StaffingGap[] = [];

  // Mutable workload tracker (copy from initial)
  const currentWorkloads = new Map<string, number>();
  for (const [tid, hours] of initialWorkloads) {
    currentWorkloads.set(tid, hours);
  }

  // Track which teacher teaches which subject (for continuity preference)
  const teacherSubjectAssignments = new Map<string, Set<string>>();

  for (const task of tasks) {
    // Skip locked tasks
    if (lockedTaskIds.has(task.id)) {
      continue;
    }

    // Get available teachers for this subject
    const subjectTeachers = teachersBySubject.get(task.subjectId) ?? [];
    if (subjectTeachers.length === 0) {
      staffingGaps.push({
        taskId: task.id,
        subjectId: task.subjectId,
        subjectName: task.subjectName,
        classId: task.classId,
        className: task.className,
        weeklyHours: task.weeklyHours,
        reason: "Brak aktywnych nauczycieli",
        availableTeachersCount: 0,
        suggestedSolutions: ["Dodaj aktywnych nauczycieli"],
      });
      continue;
    }

    // Filter teachers: exclude those in task.excludedTeachers,
    // then split into those within workload limit and those exceeding
    const candidatesWithinLimit: TeacherAvailability[] = [];
    const allCandidates: TeacherAvailability[] = [];

    for (const teacher of subjectTeachers) {
      if (task.excludedTeachers.includes(teacher.teacherId)) {
        continue;
      }

      allCandidates.push(teacher);

      const current = currentWorkloads.get(teacher.teacherId) ?? 0;
      const projected = current + task.weeklyHours;
      if (projected <= teacher.maxWorkload + maxOverload) {
        candidatesWithinLimit.push(teacher);
      }
    }

    // Use within-limit candidates if available, otherwise all candidates
    // (matches old behavior: dostepniZObciazeniem.length > 0 ? dostepniZObciazeniem : dostepni)
    const candidates =
      candidatesWithinLimit.length > 0 ? candidatesWithinLimit : allCandidates;

    if (candidates.length === 0) {
      staffingGaps.push({
        taskId: task.id,
        subjectId: task.subjectId,
        subjectName: task.subjectName,
        classId: task.classId,
        className: task.className,
        weeklyHours: task.weeklyHours,
        reason: "Brak aktywnych nauczycieli",
        availableTeachersCount: 0,
        suggestedSolutions: ["Dodaj aktywnych nauczycieli"],
      });
      continue;
    }

    // Sort candidates: continuity preference, then workload % ascending
    // PARITY: exact same sorting logic as old code
    const sorted = [...candidates].sort((a, b) => {
      const aWorkload = currentWorkloads.get(a.teacherId) ?? 0;
      const bWorkload = currentWorkloads.get(b.teacherId) ?? 0;
      const aPercent = (aWorkload / a.maxWorkload) * 100;
      const bPercent = (bWorkload / b.maxWorkload) * 100;

      if (preferContinuity) {
        const aTeachesSubject =
          teacherSubjectAssignments.get(a.teacherId)?.has(task.subjectId) ??
          false;
        const bTeachesSubject =
          teacherSubjectAssignments.get(b.teacherId)?.has(task.subjectId) ??
          false;

        if (aTeachesSubject && !bTeachesSubject) {
          return -1;
        }
        if (!aTeachesSubject && bTeachesSubject) {
          return 1;
        }
      }

      // Prefer lower workload percentage (workload balancing)
      return aPercent - bPercent;
    });

    const chosen = sorted[0];
    const chosenCurrentWorkload = currentWorkloads.get(chosen.teacherId) ?? 0;
    const newWorkload = chosenCurrentWorkload + task.weeklyHours;

    // Determine reason
    let reason = "Wyrównanie obciążeń";
    if (preferContinuity) {
      const teachesSubject =
        teacherSubjectAssignments.get(chosen.teacherId)?.has(task.subjectId) ??
        false;
      if (teachesSubject) {
        reason = "Kontynuacja przedmiotu";
      }
    }

    const assignment: Assignment = {
      taskId: task.id,
      subjectId: task.subjectId,
      subjectName: task.subjectName,
      classId: task.classId,
      className: task.className,
      teacherId: chosen.teacherId,
      teacherName: chosen.teacherName,
      weeklyHours: task.weeklyHours,
      annualHours: task.annualHours,
      reason,
      priority: task.priority,
    };

    assignments.push(assignment);

    // Update workloads
    currentWorkloads.set(chosen.teacherId, newWorkload);

    // Track teacher-subject assignment for continuity
    if (!teacherSubjectAssignments.has(chosen.teacherId)) {
      teacherSubjectAssignments.set(chosen.teacherId, new Set());
    }
    teacherSubjectAssignments.get(chosen.teacherId)!.add(task.subjectId);
  }

  // ─── Compute workload statistics ──────────────────────────────────────────
  const workloadStatistics: WorkloadStatistics[] = [];
  for (const [teacherId, meta] of teacherMetadata) {
    const before = initialWorkloads.get(teacherId) ?? 0;
    const after = currentWorkloads.get(teacherId) ?? before;
    const teacherAssignments = assignments.filter(
      (a) => a.teacherId === teacherId,
    );

    workloadStatistics.push({
      teacherId,
      teacherName: meta.name,
      maxWorkload: meta.maxWorkload,
      workloadBefore: before,
      workloadAfter: after,
      difference: after - before,
      utilizationPercent:
        meta.maxWorkload > 0 ? (after / meta.maxWorkload) * 100 : 0,
      assignmentCount: teacherAssignments.length,
    });
  }

  // ─── Compute metrics ─────────────────────────────────────────────────────
  const allWorkloads = Array.from(currentWorkloads.values());
  const averageWorkload =
    allWorkloads.length > 0
      ? allWorkloads.reduce((sum, o) => sum + o, 0) / allWorkloads.length
      : 0;

  const variance =
    allWorkloads.length > 0
      ? allWorkloads.reduce(
          (sum, o) => sum + Math.pow(o - averageWorkload, 2),
          0,
        ) / allWorkloads.length
      : 0;
  const standardDeviation = Math.sqrt(variance);

  // Balance coefficient: 1 - (stddev / mean) — higher = more balanced
  const balanceCoefficient =
    averageWorkload > 0
      ? Math.max(0, 1 - standardDeviation / averageWorkload)
      : 0;

  const metrics: AssignmentMetrics = {
    totalTasks: tasks.length,
    successfulAssignments: assignments.length,
    failedAssignments: staffingGaps.length,
    averageWorkload,
    standardDeviation,
    balanceCoefficient,
  };

  // ─── Generate warnings ────────────────────────────────────────────────────
  const warnings: string[] = [];

  const overloaded = workloadStatistics.filter(
    (s) => s.workloadAfter > s.maxWorkload,
  );
  if (overloaded.length > 0) {
    warnings.push(
      `${overloaded.length} nauczycieli przekroczyło maksymalne obciążenie`,
    );
  }

  const underloaded = workloadStatistics.filter(
    (s) => s.utilizationPercent < 50,
  );
  if (underloaded.length > 0) {
    warnings.push(
      `${underloaded.length} nauczycieli ma obciążenie poniżej 50%`,
    );
  }

  if (staffingGaps.length > 0) {
    warnings.push(
      `${staffingGaps.length} przedmiotów nie ma przypisanych nauczycieli`,
    );
  }

  return {
    assignments,
    staffingGaps,
    workloadStatistics,
    metrics,
    warnings,
  };
}
