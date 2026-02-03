import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";

/**
 * DELETE /api/nauczyciele/obciazenie/[id] - usuń przypisanie (wpis rozkład-godzin)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config });
    const { id } = await params;
    await payload.delete({
      collection: "rozkład-godzin",
      id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Błąd przy usuwaniu przypisania:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nieznany błąd",
      },
      { status: 500 }
    );
  }
}
