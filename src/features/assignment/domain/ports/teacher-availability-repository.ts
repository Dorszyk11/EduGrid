import { type TeacherAvailability } from "@/features/assignment/domain/entities";

/**
 * Port: loads teacher availability data for the algorithm.
 */
export interface TeacherAvailabilityRepository {
  findAvailableTeachers(params: {
    subjectId: string;
    schoolYear: string;
    requireQualifications: boolean;
    excludedTeacherIds: string[];
  }): Promise<TeacherAvailability[]>;

  findAllActiveTeachers(params: { schoolYear: string }): Promise<{
    teachers: Array<{
      teacherId: string;
      teacherName: string;
      maxWorkload: number;
    }>;
    workloads: Map<string, number>;
  }>;
}
