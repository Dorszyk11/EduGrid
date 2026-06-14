import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";
import { requireUserId, ownerScope } from "@/lib/api/guard";
import { errorResponse } from "@/lib/api/respond";
import { ValidationError } from "@/lib/errors";
import type { Id } from "@/types/domain";

/**
 * GET /api/siatka-szkoly/dostepne-lata?typSzkolyId=...
 * Unikalne lata szkolne (malejąco) z rozkładu klas konta dla danego typu szkoły.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    const { searchParams } = new URL(request.url);
    const typSzkolyId = searchParams.get("typSzkolyId");
    if (!typSzkolyId) {
      throw new ValidationError("typSzkolyId jest wymagany", "typSzkolyId");
    }

    const payload = await getPayload({ config });
    const klasy = await payload.find({
      collection: "klasy",
      where: {
        and: [
          { typ_szkoly: { equals: typSzkolyId } },
          { aktywna: { equals: true } },
          ownerScope(userId),
        ],
      },
      limit: 1000,
      depth: 0,
    });

    const klasaIds = (klasy.docs as Array<{ id: Id }>).map((k) => k.id);
    if (klasaIds.length === 0) {
      return NextResponse.json({ lata: [] as string[] });
    }

    const rozklad = await payload.find({
      collection: "rozkład-godzin",
      where: { klasa: { in: klasaIds } },
      limit: 10000,
      depth: 0,
    });

    const lata = new Set<string>();
    for (const r of rozklad.docs as Array<{ rok_szkolny?: unknown }>) {
      const rs = r.rok_szkolny;
      if (typeof rs === "string" && /^\d{4}\/\d{4}$/.test(rs)) {
        lata.add(rs);
      }
    }
    const sorted = [...lata].sort((a, b) => b.localeCompare(a, "pl"));
    return NextResponse.json({ lata: sorted });
  } catch (error) {
    return errorResponse(error);
  }
}
