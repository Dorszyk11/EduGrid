import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import { z } from 'zod';
import config from '@/payload.config';
import { requireUserId } from '@/lib/api/guard';
import { validateInput } from '@/lib/validation';
import { ConflictError } from '@/lib/errors';
import { errorResponse } from '@/lib/api/respond';
import type { Id } from '@/types/domain';

type TypSzkolyRow = { id: Id; nazwa?: string; liczba_lat?: number; kod_mein?: string };

export async function GET() {
  try {
    const payload = await getPayload({ config });

    const typySzkol = await payload.find({
      collection: 'typy-szkol',
      limit: 100,
    });

    const mapped = (typySzkol.docs as unknown as TypSzkolyRow[]).map((item) => ({
      id: item.id,
      nazwa: item.nazwa || 'Brak nazwy',
      liczba_lat: item.liczba_lat,
      kod_mein: item.kod_mein,
    }));

    return NextResponse.json(mapped, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Nieznany błąd';
    const isDbError =
      /cannot connect|ECONNREFUSED|connection refused|ENOTFOUND|ETIMEDOUT|password authentication failed/i.test(
        msg,
      );

    console.error('Błąd przy pobieraniu typów szkół:', msg);

    if (isDbError) {
      return NextResponse.json([]);
    }

    return NextResponse.json(
      { error: 'Błąd serwera', details: msg },
      { status: 500 },
    );
  }
}

const createTypSzkolySchema = z.object({
  nazwa: z.string().trim().min(1, 'nazwa jest wymagana'),
  liczba_lat: z.coerce.number().int().min(1, 'liczba_lat musi być w zakresie 1–8').max(8, 'liczba_lat musi być w zakresie 1–8'),
  kod_mein: z.union([z.string(), z.number()]).transform((v) => String(v).trim()).pipe(z.string().min(1, 'kod_mein jest wymagany')),
});

/** POST /api/typy-szkol – dodaj typ szkoły do słownika (wymaga zalogowania). */
export async function POST(request: NextRequest) {
  try {
    await requireUserId(request);
    const body = await request.json().catch(() => ({}));
    const input = validateInput(createTypSzkolySchema, body);

    const payload = await getPayload({ config });
    try {
      const created = (await payload.create({
        collection: 'typy-szkol',
        data: {
          nazwa: input.nazwa,
          liczba_lat: input.liczba_lat,
          kod_mein: input.kod_mein,
        },
      })) as unknown as TypSzkolyRow;
      return NextResponse.json({
        id: created.id,
        nazwa: created.nazwa,
        liczba_lat: created.liczba_lat,
        kod_mein: created.kod_mein,
      });
    } catch (createErr) {
      const msg = createErr instanceof Error ? createErr.message : '';
      if (/unique|duplicate/i.test(msg)) {
        throw new ConflictError('Typ szkoły z takim kodem MEiN już istnieje.');
      }
      throw createErr;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
