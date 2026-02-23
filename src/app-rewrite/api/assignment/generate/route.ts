import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { SupabaseAssignmentTaskRepository } from "@/features/assignment/infrastructure/supabase-assignment-task-repository";
import { SupabaseTeacherAvailabilityRepository } from "@/features/assignment/infrastructure/supabase-teacher-availability-repository";
import { GenerateAutomaticAssignment } from "@/features/assignment/application/generate-automatic-assignment";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { classId, schoolTypeId, schoolYear } = body;

    if (!classId || !schoolTypeId) {
      return NextResponse.json(
        { error: "classId and schoolTypeId are required" },
        { status: 400 },
      );
    }

    const db = createServerClient();
    const taskRepo = new SupabaseAssignmentTaskRepository(db);
    const teacherRepo = new SupabaseTeacherAvailabilityRepository(db);
    const useCase = new GenerateAutomaticAssignment(taskRepo, teacherRepo);

    const result = await useCase.execute({
      classId,
      schoolTypeId,
      schoolYear: schoolYear ?? new Date().getFullYear().toString(),
    });

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Generate assignment error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
