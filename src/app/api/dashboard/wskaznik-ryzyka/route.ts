import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { obliczWskaznikRyzyka } from '@/utils/wskaznikRyzyka';
import { requireUserId } from '@/lib/api/guard';
import { errorResponse } from '@/lib/api/respond';
import { ValidationError } from '@/lib/errors';

/**
 * GET /api/dashboard/wskaznik-ryzyka - Oblicza wskaźnik ryzyka dla szkoły
 *
 * Parametry:
 * - typSzkolyId: ID typu szkoły (wymagane)
 * - rokSzkolny: Rok szkolny (opcjonalnie, domyślnie 2024/2025)
 */
export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const { searchParams } = new URL(request.url);
    const typSzkolyId = searchParams.get('typSzkolyId');
    const rokSzkolny = searchParams.get('rokSzkolny') || '2024/2025';

    if (!typSzkolyId) {
      throw new ValidationError('typSzkolyId jest wymagany', 'typSzkolyId');
    }

    const payload = await getPayload({ config });

    const wskaznik = await obliczWskaznikRyzyka(payload, typSzkolyId, rokSzkolny, userId);

    return NextResponse.json({
      wskaznik,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
