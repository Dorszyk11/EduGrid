import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";
import { requireUserId, canAccessOwned, ownerIdOf } from "@/lib/api/guard";
import { errorResponse } from "@/lib/api/respond";
import { NotFoundError } from "@/lib/errors";
import type { RozkladRow, NauczycielRow } from "@/types/domain";

/**
 * DELETE /api/nauczyciele/obciazenie/[id] - usuń przypisanie (wpis rozkład-godzin).
 * Dozwolone tylko, gdy dotyczy nauczyciela należącego do zalogowanego konta.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(request);
    const { id } = await params;
    const payload = await getPayload({ config });

    const rozklad = (await payload
      .findByID({ collection: "rozkład-godzin", id, depth: 0 })
      .catch(() => null)) as RozkladRow | null;
    if (!rozklad) {
      throw new NotFoundError("Przypisanie", id);
    }

    const nauczycielId = ownerIdOf(rozklad.nauczyciel);
    const nauczyciel = nauczycielId
      ? ((await payload
          .findByID({ collection: "nauczyciele", id: nauczycielId })
          .catch(() => null)) as NauczycielRow | null)
      : null;
    if (!nauczyciel || !canAccessOwned(nauczyciel.wlasciciel, userId)) {
      throw new NotFoundError("Przypisanie", id);
    }

    await payload.delete({ collection: "rozkład-godzin", id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
