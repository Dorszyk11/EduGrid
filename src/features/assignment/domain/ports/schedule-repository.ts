import { type Assignment } from "@/features/assignment/domain/entities";

/**
 * Port: schedule repository for reading locked entries and saving assignments.
 */
export interface ScheduleRepository {
  findLockedTaskIds(params: { schoolYear: string }): Promise<Set<string>>;

  saveAssignments(
    assignments: readonly Assignment[],
    schoolYear: string,
  ): Promise<void>;

  deleteAssignments(params: {
    schoolYear: string;
    excludeLockedEntries: boolean;
  }): Promise<number>;
}
