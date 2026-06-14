import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import type { Where } from "payload";
import { z } from "zod";
import config from "@/payload.config";
import { requireUserId, toOwnerId, ownerIdOf, ownerScope } from "@/lib/api/guard";
import { errorResponse } from "@/lib/api/respond";
import { validateInput } from "@/lib/validation";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { Id, Ref } from "@/types/domain";

type KlasaRow = {
  id: Id;
  nazwa?: string;
  rok_szkolny?: string;
  profil?: string | null;
  wlasciciel?: Id | { id: Id } | null;
  typ_szkoly?: Ref<{ nazwa?: string }>;
};

/**
 * GET /api/klasy - lista klas konta (opcjonalne filtry: typSzkolyId, rokSzkolny).
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    const { searchParams } = new URL(request.url);
    const typSzkolyId = searchParams.get("typSzkolyId");
    const rokSzkolny = searchParams.get("rokSzkolny");

    const and: Where[] = [{ aktywna: { equals: true } }, ownerScope(userId)];
    if (typSzkolyId) {
      const idTyp = Number(typSzkolyId);
      and.push({ typ_szkoly: { equals: Number.isNaN(idTyp) ? typSzkolyId : idTyp } });
    }
    if (rokSzkolny) {
      and.push({ rok_szkolny: { equals: rokSzkolny } });
    }

    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "klasy",
      where: { and },
      limit: 500,
      depth: 1,
    });

    const klasy = (result.docs as unknown as KlasaRow[]).map((k) => {
      const wlascicielId = ownerIdOf(k.wlasciciel);
      const typ = k.typ_szkoly;
      return {
        id: k.id,
        nazwa: k.nazwa,
        rok_szkolny: k.rok_szkolny,
        profil: k.profil ?? null,
        typ_szkoly:
          typ != null
            ? {
                id: typeof typ === "object" ? typ.id : typ,
                nazwa: typeof typ === "object" ? typ.nazwa : undefined,
              }
            : null,
        // właściciel == konto lub legacy (null) → konto może zarządzać
        can_manage: wlascicielId == null || wlascicielId === userId,
      };
    });

    return NextResponse.json({ klasy, total: result.totalDocs });
  } catch (error) {
    return errorResponse(error);
  }
}

const createKlasaSchema = z.object({
  typ_szkoly_id: z.union([z.number(), z.string()]),
  rok_poczatku: z.union([z.number(), z.string()]),
  litera: z.string().trim().min(1, "Litera oddziału jest wymagana."),
  profil: z.string().optional(),
});

/**
 * POST /api/klasy - utwórz klasę przypisaną do konta.
 * rok_szkolny zapisywany jako zakres YYYY-YYYY na podstawie liczba_lat typu szkoły.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    const body = await request.json().catch(() => ({}));
    const input = validateInput(createKlasaSchema, body);

    const startYear = Number(input.rok_poczatku);
    if (Number.isNaN(startYear) || startYear < 2000 || startYear > 2040) {
      throw new ValidationError("rok_poczatku musi być rokiem 2000–2040", "rok_poczatku");
    }

    const payload = await getPayload({ config });
    const rawId = input.typ_szkoly_id;
    const numId = Number(rawId);
    const typSzkoly = (await payload
      .findByID({ collection: "typy-szkol", id: !Number.isNaN(numId) ? numId : (rawId as string) })
      .catch(() => null)) as { id: Id; liczba_lat?: number } | null;

    if (!typSzkoly) {
      throw new NotFoundError("Typ szkoły", String(rawId));
    }
    const liczbaLat = typSzkoly.liczba_lat ?? 0;
    if (liczbaLat < 1 || liczbaLat > 8) {
      throw new ValidationError("Typ szkoły musi mieć liczba_lat w zakresie 1–8");
    }

    const data: Record<string, unknown> = {
      nazwa: String(input.litera).trim().toUpperCase(),
      typ_szkoly: typSzkoly.id,
      rok_szkolny: `${startYear}-${startYear + liczbaLat}`,
      aktywna: true,
      wlasciciel: toOwnerId(userId),
    };
    if (input.profil != null && String(input.profil).trim() !== "") {
      data.profil = String(input.profil).trim();
    }

    const created = (await payload.create({
      collection: "klasy",
      data,
    })) as unknown as KlasaRow;

    return NextResponse.json({
      id: created.id,
      nazwa: created.nazwa,
      rok_szkolny: created.rok_szkolny,
      typ_szkoly: created.typ_szkoly,
      created: true,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
