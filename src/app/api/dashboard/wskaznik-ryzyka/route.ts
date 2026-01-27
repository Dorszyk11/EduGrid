import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { obliczWskaznikRyzyka } from '@/utils/wskaznikRyzyka';

/**
 * GET /api/dashboard/wskaznik-ryzyka - Oblicza wskaźnik ryzyka dla szkoły
 * 
 * Parametry:
 * - typSzkolyId: ID typu szkoły (wymagane)
 * - rokSzkolny: Rok szkolny (opcjonalnie, domyślnie 2024/2025)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typSzkolyId = searchParams.get('typSzkolyId');
    const rokSzkolny = searchParams.get('rokSzkolny') || '2024/2025';

    if (!typSzkolyId) {
      return NextResponse.json(
        { error: 'typSzkolyId jest wymagany' },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    const wskaznik = await obliczWskaznikRyzyka(payload, typSzkolyId, rokSzkolny);

    return NextResponse.json({
      wskaznik,
    });
  } catch (error) {
    console.error('Błąd przy obliczaniu wskaźnika ryzyka:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}
