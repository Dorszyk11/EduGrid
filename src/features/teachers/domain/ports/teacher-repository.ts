import { type Teacher } from "@/features/teachers/domain/entities";

export interface TeacherRepository {
  findAll(): Promise<Teacher[]>;
  findById(id: string): Promise<Teacher | null>;
  findActive(): Promise<Teacher[]>;
  create(
    data: Omit<Teacher, "id" | "createdAt" | "updatedAt">,
  ): Promise<Teacher>;
  update(
    id: string,
    data: Partial<Omit<Teacher, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Teacher>;
  delete(id: string): Promise<void>;
}
