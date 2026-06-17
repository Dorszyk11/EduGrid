import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { requireUserId } from '@/lib/api/guard';
import { errorResponse } from '@/lib/api/respond';

/**
 * GET /api/mapowania - Pobiera listę mapowań nazw
 * 
 * Parametry:
 * - typ: 'przedmiot' | 'typ_szkoly' (opcjonalnie)
 * - aktywne: 'true' | 'false' (opcjonalnie)
 */
export async function GET(request: Request) {
  try {
    await requireUserId(request);
    const { searchParams } = new URL(request.url);
    const typ = searchParams.get('typ');
    const aktywne = searchParams.get('aktywne');

    const payload = await getPayload({ config });

    const warunki: any = {
      and: [],
    };

    if (typ && (typ === 'przedmiot' || typ === 'typ_szkoly')) {
      warunki.and.push({
        typ: {
          equals: typ,
        },
      });
    }

    if (aktywne === 'true') {
      warunki.and.push({
        aktywne: {
          equals: true,
        },
      });
    }

    const mapowania = await payload.find({
      collection: 'mapowania-nazw',
      where: warunki.and.length > 0 ? warunki : undefined,
      limit: 1000,
      sort: 'nazwa_mein',
    });

    return NextResponse.json({
      mapowania: mapowania.docs.map((m: any) => ({
        id: m.id,
        nazwa_mein: m.nazwa_mein,
        nazwa_szkola: m.nazwa_szkola,
        typ: m.typ,
        aktywne: m.aktywne,
        uwagi: m.uwagi || null,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
