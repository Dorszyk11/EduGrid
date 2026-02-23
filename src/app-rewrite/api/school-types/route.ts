import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  try {
    const db = createServerClient();
    const { data, error } = await db
      .from("school_types")
      .select("id, name")
      .order("name");

    if (error) throw error;

    return NextResponse.json(
      (data ?? []).map((t: Record<string, unknown>) => ({
        id: String(t.id),
        name: t.name as string,
      })),
    );
  } catch (error) {
    console.error("School types error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
