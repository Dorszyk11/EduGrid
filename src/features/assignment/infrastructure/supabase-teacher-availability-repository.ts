import type { SupabaseClient } from "@/lib/supabase";
import type { TeacherAvailabilityRepository } from "@/features/assignment/domain/ports";
import type { TeacherAvailability } from "@/features/assignment/domain/entities";
import { EMPLOYMENT_TO_MAX_HOURS } from "@/shared/types/value-objects";

/**
 * Infrastructure: Supabase implementation of TeacherAvailabilityRepository.
 *
 * Teachers are matched to subjects via qualifications table.
 */
export class SupabaseTeacherAvailabilityRepository implements TeacherAvailabilityRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findAvailableTeachers(params: {
    subjectId: string;
    schoolYear: string;
    requireQualifications: boolean;
    excludedTeacherIds: string[];
  }): Promise<TeacherAvailability[]> {
    // Get teachers qualified for the subject
    let query = this.db
      .from("teacher_qualifications")
      .select(
        `
        teacher_id,
        teachers!inner (
          id,
          first_name,
          last_name,
          employment_type,
          is_active
        )
      `,
      )
      .eq("subject_id", params.subjectId)
      .eq("teachers.is_active", true);

    if (params.excludedTeacherIds.length > 0) {
      query = query.not(
        "teacher_id",
        "in",
        `(${params.excludedTeacherIds.join(",")})`,
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to load available teachers: ${error.message}`);
    }

    // Get current workloads for these teachers
    const teacherIds = (data ?? []).map(
      (r: Record<string, unknown>) => r.teacher_id as string,
    );
    const workloads = await this.getWorkloads(teacherIds, params.schoolYear);

    return (data ?? []).map((row: Record<string, unknown>) => {
      const teacher = row.teachers as Record<string, unknown>;
      const teacherId = row.teacher_id as string;
      const employment = teacher.employment_type as string;
      const maxHours = EMPLOYMENT_TO_MAX_HOURS[employment] ?? 18;

      return {
        teacherId,
        teacherName: `${teacher.first_name} ${teacher.last_name}`,
        maxWorkload: maxHours,
        currentWorkload: workloads.get(teacherId) ?? 0,
        qualifiedSubjectIds: [params.subjectId],
        hasContinuity: false, // Set by the domain service
        employmentType: employment,
      };
    });
  }

  async findAllActiveTeachers(params: { schoolYear: string }): Promise<{
    teachers: Array<{
      teacherId: string;
      teacherName: string;
      maxWorkload: number;
    }>;
    workloads: Map<string, number>;
  }> {
    const { data, error } = await this.db
      .from("teachers")
      .select("id, first_name, last_name, employment_type")
      .eq("is_active", true);

    if (error) {
      throw new Error(`Failed to load teachers: ${error.message}`);
    }

    const teachers = (data ?? []).map((t: Record<string, unknown>) => ({
      teacherId: t.id as string,
      teacherName: `${t.first_name} ${t.last_name}`,
      maxWorkload: EMPLOYMENT_TO_MAX_HOURS[t.employment_type as string] ?? 18,
    }));

    const teacherIds = teachers.map((t) => t.teacherId);
    const workloads = await this.getWorkloads(teacherIds, params.schoolYear);

    return { teachers, workloads };
  }

  private async getWorkloads(
    teacherIds: string[],
    schoolYear: string,
  ): Promise<Map<string, number>> {
    if (teacherIds.length === 0) return new Map();

    const { data, error } = await this.db
      .from("schedule_entries")
      .select("teacher_id, hours_per_week")
      .eq("school_year", schoolYear)
      .in("teacher_id", teacherIds);

    if (error) {
      throw new Error(`Failed to load workloads: ${error.message}`);
    }

    const workloads = new Map<string, number>();
    for (const row of data ?? []) {
      const current = workloads.get(row.teacher_id) ?? 0;
      workloads.set(row.teacher_id, current + (row.hours_per_week ?? 0));
    }
    return workloads;
  }
}
