import { z } from "zod";
import type { SupabaseClient } from "@/lib/supabase";
import { validateInput } from "@/lib/validation";

const SaveAssignmentInputSchema = z.object({
  classId: z.string().min(1),
  assigned: z.record(z.record(z.number())),
  directorAssigned: z.record(z.record(z.number())),
  extensionAssigned: z.record(z.record(z.number())),
  groupSplit: z.record(z.record(z.boolean())),
  groupAssigned: z.record(
    z.record(z.object({ g1: z.number(), g2: z.number() })),
  ),
  extensionSubjectKeys: z.array(z.string()),
  counselingRealized: z.record(z.record(z.number())),
});

type SaveAssignmentInput = z.infer<typeof SaveAssignmentInputSchema>;

/**
 * Application Use Case: Save Assignment State
 *
 * Persists the complete class assignment state (hours, director hours,
 * extensions, group splits) to the database as a JSON document.
 */
export class SaveAssignmentState {
  constructor(private readonly db: SupabaseClient) {}

  async execute(input: SaveAssignmentInput): Promise<void> {
    const validated = validateInput(SaveAssignmentInputSchema, input);

    const { error } = await this.db.from("class_assignment_state").upsert(
      {
        class_id: validated.classId,
        assigned: validated.assigned,
        director_assigned: validated.directorAssigned,
        extension_assigned: validated.extensionAssigned,
        group_split: validated.groupSplit,
        group_assigned: validated.groupAssigned,
        extension_subject_keys: validated.extensionSubjectKeys,
        counseling_realized: validated.counselingRealized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "class_id" },
    );

    if (error) {
      throw new Error(`Failed to save assignment state: ${error.message}`);
    }
  }
}
