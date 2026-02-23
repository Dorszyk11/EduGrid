import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { LoadAssignmentState } from "@/features/assignment/application/load-assignment-state";
import { SaveAssignmentState } from "@/features/assignment/application/save-assignment-state";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    if (!classId) {
      return NextResponse.json(
        { error: "classId is required" },
        { status: 400 },
      );
    }

    const db = createServerClient();
    const useCase = new LoadAssignmentState(db);
    const state = await useCase.execute(classId);

    if (!state) {
      return NextResponse.json({
        classId,
        assigned: {},
        directorAssigned: {},
        extensionAssigned: {},
        groupSplit: {},
        groupAssigned: {},
        extensionSubjectKeys: [],
        counselingRealized: {},
      });
    }

    return NextResponse.json({
      ...state,
      extensionSubjectKeys: Array.from(state.extensionSubjectKeys),
    });
  } catch (error) {
    console.error("Load assignment state error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.classId) {
      return NextResponse.json(
        { error: "classId is required" },
        { status: 400 },
      );
    }

    const db = createServerClient();
    const useCase = new SaveAssignmentState(db);
    await useCase.execute(body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save assignment state error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
