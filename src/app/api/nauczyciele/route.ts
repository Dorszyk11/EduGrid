import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import { z } from "zod";
import config from "@/payload.config";
import { requireUserId, toOwnerId, ownerScope } from "@/lib/api/guard";
import { errorResponse } from "@/lib/api/respond";
import { validateInput } from "@/lib/validation";
import type { NauczycielRow } from "@/types/domain";

/**
 * GET /api/nauczyciele — lista nauczycieli zalogowanego konta
 * (imię, nazwisko, specjalizacja/przedmioty, maks. obciążenie).
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "nauczyciele",
      where: ownerScope(userId),
      limit: 500,
      depth: 1,
    });
    const docs = result.docs as unknown as NauczycielRow[];
    const nauczyciele = docs.map((n) => ({
      id: n.id,
      imie: n.imie,
      nazwisko: n.nazwisko,
      max_obciazenie:
        typeof n.max_obciazenie === "number" ? n.max_obciazenie : 18,
      przedmioty: Array.isArray(n.przedmioty)
        ? n.przedmioty.map((p) =>
            typeof p === "object" && p?.id != null
              ? { id: p.id, nazwa: p.nazwa ?? null }
              : { id: p as Exclude<typeof p, object>, nazwa: null }
          )
        : [],
    }));
    return NextResponse.json(nauczyciele);
  } catch (error) {
    return errorResponse(error);
  }
}

const createNauczycielSchema = z.object({
  imie: z.string().trim().min(1, "Imię jest wymagane."),
  nazwisko: z.string().trim().min(1, "Nazwisko jest wymagane."),
  przedmioty: z.array(z.union([z.number(), z.string()])).optional(),
  max_obciazenie: z.union([z.number(), z.string()]).optional(),
});

/**
 * POST /api/nauczyciele — dodaj nauczyciela do konta zalogowanego użytkownika.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    const body = await request.json().catch(() => ({}));
    const input = validateInput(createNauczycielSchema, body);

    // Payload (Postgres) oczekuje numerycznych ID dla relacji 'przedmioty'.
    const przedmiotyIds = (input.przedmioty ?? [])
      .map((id) => (typeof id === "number" ? id : Number(id)))
      .filter((n) => Number.isFinite(n) && n > 0);

    const rawMax =
      typeof input.max_obciazenie === "number"
        ? input.max_obciazenie
        : input.max_obciazenie != null
          ? parseFloat(input.max_obciazenie)
          : NaN;
    const maxObc =
      Number.isFinite(rawMax) && rawMax >= 0 && rawMax <= 40 ? rawMax : 18;

    const payload = await getPayload({ config });
    const doc = (await payload.create({
      collection: "nauczyciele",
      data: {
        imie: input.imie,
        nazwisko: input.nazwisko,
        przedmioty: przedmiotyIds,
        max_obciazenie: maxObc,
        wlasciciel: toOwnerId(userId),
      },
    })) as unknown as NauczycielRow;

    return NextResponse.json({
      id: doc.id,
      imie: doc.imie,
      nazwisko: doc.nazwisko,
      przedmioty: doc.przedmioty ?? [],
    });
  } catch (error) {
    return errorResponse(error);
  }
}
