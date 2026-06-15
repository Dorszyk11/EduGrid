import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import { z } from 'zod';
import config from '@/payload.config';
import { requireUserId } from '@/lib/api/guard';
import { errorResponse } from '@/lib/api/respond';
import { validateInput } from '@/lib/validation';
import type { Id } from '@/types/domain';

type PrzedmiotRow = {
  id: Id;
  nazwa?: string;
  kod_mein?: string;
  typ_zajec?: string;
  poziom?: string;
  aktywny?: boolean;
};

/** GET /api/przedmioty – lista przedmiotów (słownik współdzielony). */
export async function GET() {
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: 'przedmioty',
      limit: 500,
    });
    const mapped = (res.docs as unknown as PrzedmiotRow[]).map((p) => ({
      id: p.id,
      nazwa: p.nazwa ?? 'Brak nazwy',
      kod_mein: p.kod_mein,
      typ_zajec: p.typ_zajec,
      poziom: p.poziom,
      aktywny: p.aktywny !== false,
    }));
    return NextResponse.json(mapped);
  } catch (error) {
    return errorResponse(error);
  }
}

const createPrzedmiotSchema = z.object({
  nazwa: z.string().trim().min(1, 'nazwa jest wymagana'),
  kod_mein: z.union([z.string(), z.number()]).optional(),
  typ_zajec: z.enum(['ogolnoksztalcace', 'zawodowe_teoretyczne', 'zawodowe_praktyczne']),
  poziom: z.enum(['podstawowy', 'rozszerzony', 'brak']),
  aktywny: z.boolean().optional(),
  jednostka_org: z.union([z.string(), z.number()]).optional(),
});

/** POST /api/przedmioty – dodaj przedmiot do słownika (wymaga zalogowania). */
export async function POST(request: NextRequest) {
  try {
    await requireUserId(request);
    const body = await request.json().catch(() => ({}));
    const input = validateInput(createPrzedmiotSchema, body);

    const payload = await getPayload({ config });
    const created = (await payload.create({
      collection: 'przedmioty',
      data: {
        nazwa: input.nazwa,
        kod_mein: input.kod_mein != null ? String(input.kod_mein).trim() : undefined,
        typ_zajec: input.typ_zajec,
        poziom: input.poziom,
        aktywny: input.aktywny !== false,
        jednostka_org: input.jednostka_org != null ? String(input.jednostka_org).trim() : undefined,
      },
    })) as unknown as PrzedmiotRow;
    return NextResponse.json({
      id: created.id,
      nazwa: created.nazwa,
      kod_mein: created.kod_mein,
      typ_zajec: created.typ_zajec,
      poziom: created.poziom,
      aktywny: created.aktywny !== false,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
