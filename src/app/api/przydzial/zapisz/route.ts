import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";
import type { Przypisanie } from "@/utils/automatycznyRozdzialGodzin";

/**
 * POST /api/przydzial/zapisz - Zapisuje przypisania do bazy danych
 *
 * Body:
 * {
 *   przypisania: Przypisanie[];
 *   rokSzkolny: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { przypisania, rokSzkolny } = body;

    if (!przypisania || !Array.isArray(przypisania)) {
      return NextResponse.json(
        { error: "przypisania musi być tablicą" },
        { status: 400 }
      );
    }

    if (!rokSzkolny) {
      return NextResponse.json(
        { error: "rokSzkolny jest wymagany" },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    const utworzone: string[] = [];
    const bledy: Array<{ przypisanie: Przypisanie; error: string }> = [];

    for (const przypisanie of przypisania) {
      try {
        // Sprawdź, czy już istnieje przypisanie dla tego przedmiotu w klasie
        const istniejące = await payload.find({
          collection: "rozkład-godzin",
          where: {
            and: [
              {
                przedmiot: {
                  equals: przypisanie.przedmiotId,
                },
              },
              {
                klasa: {
                  equals: przypisanie.klasaId,
                },
              },
              {
                nauczyciel: {
                  equals: przypisanie.nauczycielId,
                },
              },
              {
                rok_szkolny: {
                  equals: rokSzkolny,
                },
              },
            ],
          },
          limit: 1,
        });

        if (istniejące.docs.length > 0) {
          // Aktualizuj istniejące przypisanie
          await payload.update({
            collection: "rozkład-godzin",
            id: istniejące.docs[0].id,
            data: {
              godziny_tyg: przypisanie.godzinyTygodniowo,
              godziny_roczne: przypisanie.godzinyRoczne,
            },
          });
          utworzone.push(`Zaktualizowano: ${istniejące.docs[0].id}`);
        } else {
          // Utwórz nowe przypisanie
          const nowe = await payload.create({
            collection: "rozkład-godzin",
            data: {
              przedmiot: przypisanie.przedmiotId,
              klasa: przypisanie.klasaId,
              nauczyciel: przypisanie.nauczycielId,
              godziny_tyg: przypisanie.godzinyTygodniowo,
              godziny_roczne: przypisanie.godzinyRoczne,
              rok_szkolny: rokSzkolny,
            },
          });
          utworzone.push(String(nowe.id));
        }
      } catch (error) {
        bledy.push({
          przypisanie,
          error: error instanceof Error ? error.message : "Nieznany błąd",
        });
      }
    }

    return NextResponse.json({
      success: true,
      utworzone: utworzone.length,
      bledy: bledy.length,
      szczegoly: {
        utworzone,
        bledy,
      },
    });
  } catch (error) {
    console.error("Błąd przy zapisywaniu przydziału:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nieznany błąd",
      },
      { status: 500 }
    );
  }
}
