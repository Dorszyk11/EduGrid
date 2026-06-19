import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import { z } from "zod";
import config from "@/payload.config";
import { requireUserId } from "@/lib/api/guard";
import { errorResponse } from "@/lib/api/respond";
import { validateInput } from "@/lib/validation";
import { AuthorizationError } from "@/lib/errors";
import { ownedIds } from "@/lib/api/klasa-scope";
import type { Id } from "@/types/domain";

const idSchema = z.union([z.number(), z.string()]);
const przypisanieSchema = z.object({
  przedmiotId: idSchema,
  klasaId: idSchema,
  nauczycielId: idSchema,
  godzinyTygodniowo: z.number(),
  godzinyRoczne: z.number(),
});
const zapiszSchema = z.object({
  przypisania: z.array(przypisanieSchema),
  rokSzkolny: z.string().min(1, "rokSzkolny jest wymagany"),
});

type Przypisanie = z.infer<typeof przypisanieSchema>;

/**
 * POST /api/przydzial/zapisz - zapis przypisań (rozkład-godzin) konta.
 * Izolacja: wolno zapisywać wyłącznie do własnych klas i własnymi nauczycielami.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    const body = await request.json().catch(() => ({}));
    const { przypisania, rokSzkolny } = validateInput(zapiszSchema, body);

    const payload = await getPayload({ config });
    const [klasyOwned, nauczycieleOwned] = await Promise.all([
      ownedIds(payload, "klasy", userId),
      ownedIds(payload, "nauczyciele", userId),
    ]);

    for (const p of przypisania) {
      if (!klasyOwned.has(String(p.klasaId))) {
        throw new AuthorizationError("Brak dostępu do wskazanej klasy.");
      }
      if (!nauczycieleOwned.has(String(p.nauczycielId))) {
        throw new AuthorizationError("Brak dostępu do wskazanego nauczyciela.");
      }
    }

    const utworzone: string[] = [];
    const bledy: Array<{ przypisanie: Przypisanie; error: string }> = [];

    for (const przypisanie of przypisania) {
      try {
        const istniejące = await payload.find({
          collection: "rozkład-godzin",
          where: {
            and: [
              { przedmiot: { equals: przypisanie.przedmiotId } },
              { klasa: { equals: przypisanie.klasaId } },
              { nauczyciel: { equals: przypisanie.nauczycielId } },
              { rok_szkolny: { equals: rokSzkolny } },
            ],
          },
          limit: 1,
        });

        if (istniejące.docs.length > 0) {
          const existingId = (istniejące.docs[0] as { id: Id }).id;
          await payload.update({
            collection: "rozkład-godzin",
            id: existingId,
            data: {
              godziny_tyg: przypisanie.godzinyTygodniowo,
              godziny_roczne: przypisanie.godzinyRoczne,
            },
          });
          utworzone.push(`Zaktualizowano: ${existingId}`);
        } else {
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
        console.error("Błąd zapisu przypisania:", error);
        bledy.push({
          przypisanie,
          error: "Nie udało się zapisać tego przypisania.",
        });
      }
    }

    return NextResponse.json({
      success: true,
      utworzone: utworzone.length,
      bledy: bledy.length,
      szczegoly: { utworzone, bledy },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
