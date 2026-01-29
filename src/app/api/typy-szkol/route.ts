import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

export async function GET() {
  try {
    const payload = await getPayload({ config });

    const typySzkol = await payload.find({
      collection: 'typy-szkol',
      limit: 100,
    });

    const mapped = typySzkol.docs.map((item: any) => ({
      id: item.id,
      nazwa: item.nazwa || 'Brak nazwy',
      liczba_lat: item.liczba_lat,
      kod_mein: item.kod_mein,
    }));

    return NextResponse.json(mapped);
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

/** POST /api/typy-szkol – dodaj typ szkoły (nazwa, liczba_lat, kod_mein). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nazwa, liczba_lat, kod_mein } = body ?? {};
    if (!nazwa || liczba_lat == null || !kod_mein) {
      return NextResponse.json(
        { error: 'Wymagane: nazwa, liczba_lat, kod_mein' },
        { status: 400 }
      );
    }
    const payload = await getPayload({ config });
    const created = await payload.create({
      collection: 'typy-szkol',
      data: {
        nazwa: String(nazwa).trim(),
        liczba_lat: Number(liczba_lat),
        kod_mein: String(kod_mein).trim(),
      },
    });
    return NextResponse.json({
      id: created.id,
      nazwa: created.nazwa,
      liczba_lat: created.liczba_lat,
      kod_mein: created.kod_mein,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Nieznany błąd';
    const isDup = /unique|duplicate/i.test(msg);
    console.error('Błąd przy dodawaniu typu szkoły:', msg);
    return NextResponse.json(
      { error: isDup ? 'Typ szkoły z takim kodem MEiN już istnieje.' : msg },
      { status: isDup ? 409 : 500 }
    );
  }
}
