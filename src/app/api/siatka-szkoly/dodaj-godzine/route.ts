import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";

/** 1 godzina tygodniowo ≈ 38 godzin rocznie (rok szkolny), po 19 na semestr */
const GODZINY_ROCZNE_ZA_1_TYG = 38;

/**
 * POST /api/siatka-szkoly/dodaj-godzine
 * Dodaje 1 godzinę tygodniowo do istniejącego przypisania (przedmiot + klasa + rok).
 * Body: { przedmiotId: string, klasaId: string, rokSzkolny: string }
 * Jeśli nie ma żadnego przypisania, zwraca 400 – najpierw trzeba przypisać nauczyciela (np. z przydziału).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const przedmiotId = body?.przedmiotId;
    const klasaId = body?.klasaId;
    const rokSzkolny = body?.rokSzkolny;

    if (!przedmiotId || !klasaId || !rokSzkolny) {
      return NextResponse.json(
        { error: "Wymagane: przedmiotId, klasaId, rokSzkolny" },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    const rozklady = await payload.find({
      collection: "rozkład-godzin",
      where: {
        and: [
          { przedmiot: { equals: przedmiotId } },
          { klasa: { equals: klasaId } },
          { rok_szkolny: { equals: String(rokSzkolny) } },
        ],
      },
      limit: 1,
    });

    if (rozklady.docs.length === 0) {
      return NextResponse.json(
        {
          error:
            "Brak przypisania dla tego przedmiotu i klasy. Najpierw przypisz nauczyciela (np. w Przydziale godzin).",
        },
        { status: 400 }
      );
    }

    const doc = rozklady.docs[0] as any;
    const godzinyTyg = (doc.godziny_tyg ?? 0) + 1;
    const godzinyRoczne = (doc.godziny_roczne ?? 0) + GODZINY_ROCZNE_ZA_1_TYG;
    const semestr1 = (doc.semestr_1 ?? 0) + Math.floor(GODZINY_ROCZNE_ZA_1_TYG / 2);
    const semestr2 = godzinyRoczne - semestr1;

    if (godzinyTyg > 10) {
      return NextResponse.json(
        { error: "Maksymalnie 10 godzin tygodniowo na jedno przypisanie." },
        { status: 400 }
      );
    }

    await payload.update({
      collection: "rozkład-godzin",
      id: doc.id,
      data: {
        godziny_tyg: godzinyTyg,
        godziny_roczne: godzinyRoczne,
        semestr_1: semestr1,
        semestr_2: semestr2,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Dodano 1 godzinę tygodniowo.",
    });
  } catch (error) {
    console.error("Błąd przy dodawaniu godziny:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Nie udało się dodać godziny",
      },
      { status: 500 }
    );
  }
}
