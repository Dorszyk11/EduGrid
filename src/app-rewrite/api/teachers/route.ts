import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  try {
    const db = createServerClient();
    const { data, error } = await db
      .from("teachers")
      .select(
        `
        id,
        first_name,
        last_name,
        email,
        employment_type,
        is_active,
        teacher_qualifications (
          subjects ( id, name )
        )
      `,
      )
      .eq("is_active", true)
      .order("last_name")
      .order("first_name");

    if (error) throw error;

    return NextResponse.json(
      (data ?? []).map((t: Record<string, unknown>) => {
        const qualifications =
          (t.teacher_qualifications as Array<Record<string, unknown>>) ?? [];
        return {
          id: String(t.id),
          firstName: t.first_name as string,
          lastName: t.last_name as string,
          email: (t.email as string) ?? "",
          employmentType: t.employment_type as string,
          maxHours: 18, // Will be calculated from employment type
          qualifications: qualifications
            .map((q) => (q.subjects as Record<string, unknown>)?.name as string)
            .filter(Boolean),
        };
      }),
    );
  } catch (error) {
    console.error("Teachers error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
