import { z } from "zod";
import { distributeAssignments } from "@/features/assignment/domain/services";
import type {
  AssignmentTaskRepository,
  TeacherAvailabilityRepository,
} from "@/features/assignment/domain/ports";
import type {
  AssignmentResult,
  TeacherAvailability,
} from "@/features/assignment/domain/entities";
import { validateInput } from "@/lib/validation";

const GenerateAssignmentInputSchema = z.object({
  classId: z.string().min(1),
  schoolTypeId: z.string().min(1),
  schoolYear: z.string().min(1),
  lockedTaskIds: z.set(z.string()).optional(),
  maxHoursPerTeacher: z.number().positive().optional(),
  preferContinuity: z.boolean().optional(),
});

type GenerateAssignmentInput = z.infer<typeof GenerateAssignmentInputSchema>;

/**
 * Application Use Case: Generate Automatic Assignment
 *
 * Orchestrates:
 * 1. Load assignment tasks from repository
 * 2. For each unique subject, load available teachers
 * 3. Build teachersBySubject map
 * 4. Call pure domain service `distributeAssignments()`
 * 5. Return result (assignments + gaps + warnings)
 *
 * The domain service is pure — all IO happens here at the boundary.
 */
export class GenerateAutomaticAssignment {
  constructor(
    private readonly taskRepo: AssignmentTaskRepository,
    private readonly teacherRepo: TeacherAvailabilityRepository,
  ) {}

  async execute(input: GenerateAssignmentInput): Promise<AssignmentResult> {
    const validated = validateInput(GenerateAssignmentInputSchema, input);

    // 1. Load tasks
    const tasks = await this.taskRepo.findTasks({
      schoolYear: validated.schoolYear,
      schoolTypeId: validated.schoolTypeId,
    });

    if (tasks.length === 0) {
      return {
        assignments: [],
        staffingGaps: [],
        workloadStatistics: [],
        metrics: {
          totalTasks: 0,
          successfulAssignments: 0,
          failedAssignments: 0,
          totalHoursAssigned: 0,
          totalHoursUnassigned: 0,
          balanceCoefficient: 1,
        },
        warnings: ["Brak zadań przydziału dla wybranych parametrów."],
      };
    }

    // 2. Get unique subjects
    const subjectIds = [...new Set(tasks.map((t) => t.subjectId))];

    // 3. For each subject, load qualified teachers
    const teachersBySubject = new Map<string, TeacherAvailability[]>();

    const teacherPromises = subjectIds.map(async (subjectId) => {
      const teachers = await this.teacherRepo.findAvailableTeachers({
        subjectId,
        schoolYear: validated.schoolYear,
        requireQualifications: true,
        excludedTeacherIds: [],
      });
      teachersBySubject.set(subjectId, teachers);
    });

    await Promise.all(teacherPromises);

    // 4. Get initial workloads
    const { workloads: initialWorkloads, teachers: allTeachers } =
      await this.teacherRepo.findAllActiveTeachers({
        schoolYear: validated.schoolYear,
      });

    // 5. Build teacher metadata map
    const teacherMetadata = new Map(
      allTeachers.map((t) => [
        t.teacherId,
        { teacherName: t.teacherName, maxWorkload: t.maxWorkload },
      ]),
    );

    // 6. Mark continuity (previous teacher → has continuity)
    for (const task of tasks) {
      if (task.previousTeacherId) {
        const teachers = teachersBySubject.get(task.subjectId);
        if (teachers) {
          const teacher = teachers.find(
            (t) => t.teacherId === task.previousTeacherId,
          );
          if (teacher) {
            teacher.hasContinuity = true;
          }
        }
      }
    }

    // 7. Call pure domain service
    const result = distributeAssignments(
      tasks,
      teachersBySubject,
      validated.lockedTaskIds ?? new Set(),
      initialWorkloads,
      teacherMetadata,
      {
        maxHoursOverride: validated.maxHoursPerTeacher,
        preferContinuity: validated.preferContinuity ?? true,
      },
    );

    return result;
  }
}
