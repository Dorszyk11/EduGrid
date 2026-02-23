import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolTypeId = searchParams.get("schoolTypeId");

    const db = createServerClient();

    let query = db
      .from("classes")
      .select(
        `
        id,
        name,
        school_year,
        school_type_id,
        school_types ( id, name ),
        professions ( id, name )
      `,
      )
      .order("school_year", { ascending: false })
      .order("name");

    if (schoolTypeId) {
      query = query.eq("school_type_id", schoolTypeId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(
      (data ?? []).map((c: Record<string, unknown>) => ({
        id: String(c.id),
        name: c.name as string,
        schoolYear: c.school_year as string,
        schoolTypeId: String(c.school_type_id),
        schoolTypeName: (c.school_types as Record<string, unknown>)?.name ?? "",
        professionName:
          (c.professions as Record<string, unknown>)?.name ?? undefined,
      })),
    );
  } catch (error) {
    console.error("Classes error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
