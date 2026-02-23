import { type ElectiveHourAllocation } from "@/features/assignment/domain/entities";

/**
 * Port: elective hour allocation repository.
 */
export interface ElectiveAllocationRepository {
  findByClassId(classId: string): Promise<ElectiveHourAllocation | null>;

  save(allocation: ElectiveHourAllocation): Promise<void>;
}
