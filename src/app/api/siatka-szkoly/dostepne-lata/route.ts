import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";

/**
 * GET /api/siatka-szkoly/dostepne-lata?typSzkolyId=...
 * Zwraca posortowane malejąco unikalne lata szkolne z rozkładu dla klas danego typu szkoły.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typSzkolyId = searchParams.get("typSzkolyId");

    if (!typSzkolyId) {
      return NextResponse.json(
        { error: "typSzkolyId jest wymagany" },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    const klasyWszystkie = await payload.find({
      collection: "klasy",
      where: {
        and: [
          { typ_szkoly: { equals: typSzkolyId } },
          { aktywna: { equals: true } },
        ],
      },
      limit: 1000,
      depth: 0,
    });

    const klasaIds = new Set(
      klasyWszystkie.docs.map((k: { id: string | number }) => String(k.id))
    );
    if (klasaIds.size === 0) {
      return NextResponse.json({ lata: [] as string[] });
    }

    const rozkladGodzin = await payload.find({
      collection: "rozkład-godzin",
      limit: 10000,
      depth: 0,
    });

    const lata = new Set<string>();
    for (const r of rozkladGodzin.docs as any[]) {
      const rKlasa = typeof r.klasa === "object" ? r.klasa : null;
      const kid = rKlasa?.id != null ? String(rKlasa.id) : String(r.klasa ?? "");
      if (!klasaIds.has(kid)) continue;
      const rs = r.rok_szkolny;
      if (typeof rs === "string" && /^\d{4}\/\d{4}$/.test(rs)) {
        lata.add(rs);
      }
    }

    const sorted = [...lata].sort((a, b) => b.localeCompare(a, "pl"));

    return NextResponse.json({ lata: sorted });
  } catch (error) {
    console.error("Błąd przy pobieraniu lat szkolnych:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nieznany błąd",
      },
      { status: 500 }
    );
  }
}
