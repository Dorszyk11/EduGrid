import type { SupabaseClient } from "@/lib/supabase";
import type { ClassAssignmentState } from "@/features/assignment/presentation/types";

/**
 * Application Use Case: Load Assignment State
 *
 * Loads the class assignment state document from the database.
 * Returns null if no state exists for the class.
 */
export class LoadAssignmentState {
  constructor(private readonly db: SupabaseClient) {}

  async execute(classId: string): Promise<ClassAssignmentState | null> {
    const { data, error } = await this.db
      .from("class_assignment_state")
      .select("*")
      .eq("class_id", classId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw new Error(`Failed to load assignment state: ${error.message}`);
    }

    if (!data) return null;

    return {
      classId,
      assigned: (data.assigned as Record<string, Record<string, number>>) ?? {},
      directorAssigned:
        (data.director_assigned as Record<string, Record<string, number>>) ??
        {},
      extensionAssigned:
        (data.extension_assigned as Record<string, Record<string, number>>) ??
        {},
      groupSplit:
        (data.group_split as Record<string, Record<string, boolean>>) ?? {},
      groupAssigned:
        (data.group_assigned as Record<
          string,
          Record<string, { g1: number; g2: number }>
        >) ?? {},
      extensionSubjectKeys: new Set(
        (data.extension_subject_keys as string[]) ?? [],
      ),
      counselingRealized:
        (data.counseling_realized as Record<string, Record<string, number>>) ??
        {},
    };
  }
}
