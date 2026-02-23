import { type AssignmentTask } from "@/features/assignment/domain/entities";

/**
 * Port: loads assignment tasks (subject × class combinations) for the algorithm.
 */
export interface AssignmentTaskRepository {
  findTasks(params: {
    schoolYear: string;
    schoolTypeId?: string;
  }): Promise<AssignmentTask[]>;
}
