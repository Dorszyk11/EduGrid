import type { SupabaseClient } from "@/lib/supabase";
import type { AssignmentTaskRepository } from "@/features/assignment/domain/ports";
import type { AssignmentTask } from "@/features/assignment/domain/entities";

/**
 * Infrastructure: Supabase implementation of AssignmentTaskRepository.
 *
 * Loads assignment tasks (subject × class combinations) from the database.
 * Each task represents a need: "class X needs Y hours of subject Z in grade G".
 */
export class SupabaseAssignmentTaskRepository implements AssignmentTaskRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findTasks(params: {
    schoolYear: string;
    schoolTypeId?: string;
  }): Promise<AssignmentTask[]> {
    let query = this.db
      .from("assignment_tasks")
      .select(
        `
        id,
        subject_id,
        subject_name,
        class_id,
        class_name,
        grade,
        hours_needed,
        hours_to_choose,
        is_extension,
        is_director,
        is_group_split,
        locked_teacher_id,
        school_year,
        school_type_id,
        previous_teacher_id,
        notes
      `,
      )
      .eq("school_year", params.schoolYear);

    if (params.schoolTypeId) {
      query = query.eq("school_type_id", params.schoolTypeId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to load assignment tasks: ${error.message}`);
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      classId: row.class_id,
      className: row.class_name,
      grade: row.grade,
      hoursNeeded: row.hours_needed,
      hoursToChoose: row.hours_to_choose ?? 0,
      isExtension: row.is_extension ?? false,
      isDirector: row.is_director ?? false,
      isGroupSplit: row.is_group_split ?? false,
      lockedTeacherId: row.locked_teacher_id ?? undefined,
      schoolYear: row.school_year,
      schoolTypeId: row.school_type_id,
      previousTeacherId: row.previous_teacher_id ?? undefined,
      notes: row.notes ?? undefined,
    }));
  }
}
