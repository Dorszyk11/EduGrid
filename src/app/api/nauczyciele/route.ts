import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

/**
 * GET /api/nauczyciele - lista nauczycieli (imię, nazwisko, specjalizacja/przedmioty)
 */
export async function GET() {
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: 'nauczyciele',
      limit: 500,
      depth: 1,
    });
    const nauczyciele = (result.docs || []).map((n: any) => ({
      id: n.id,
      imie: n.imie,
      nazwisko: n.nazwisko,
      max_obciazenie: typeof n.max_obciazenie === 'number' ? n.max_obciazenie : 18,
      przedmioty: Array.isArray(n.przedmioty)
        ? n.przedmioty.map((p: any) => (typeof p === 'object' && p?.id != null ? { id: p.id, nazwa: p.nazwa } : { id: p, nazwa: null }))
        : [],
    }));
    return NextResponse.json(nauczyciele);
  } catch (error) {
    console.error('Błąd GET /api/nauczyciele:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Błąd serwera' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/nauczyciele - dodaj nauczyciela (imie, nazwisko, przedmioty: id[])
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imie, nazwisko, przedmioty, max_obciazenie } = body;
    if (!imie?.trim() || !nazwisko?.trim()) {
      return NextResponse.json(
        { error: 'Imię i nazwisko są wymagane.' },
        { status: 400 }
      );
    }
    const payload = await getPayload({ config });
    // Payload relationship expects numeric IDs for relationTo 'przedmioty' (Postgres default)
    const przedmiotyIds = Array.isArray(przedmioty)
      ? przedmioty
          .map((id: unknown) => (typeof id === 'number' && Number.isFinite(id) ? id : typeof id === 'string' ? Number(id) : NaN))
          .filter((n: number) => !Number.isNaN(n) && n > 0)
      : [];
    const maxObc = typeof max_obciazenie === 'number' && max_obciazenie >= 0 && max_obciazenie <= 40
      ? max_obciazenie
      : typeof max_obciazenie === 'string'
        ? (() => { const n = parseFloat(max_obciazenie); return Number.isFinite(n) && n >= 0 && n <= 40 ? n : 18; })()
        : 18;
    const doc = await payload.create({
      collection: 'nauczyciele',
      data: {
        imie: String(imie).trim(),
        nazwisko: String(nazwisko).trim(),
        przedmioty: przedmiotyIds,
        max_obciazenie: maxObc,
      },
    });
    return NextResponse.json({
      id: doc.id,
      imie: doc.imie,
      nazwisko: doc.nazwisko,
      przedmioty: doc.przedmioty ?? [],
    });
  } catch (error) {
    console.error('Błąd POST /api/nauczyciele:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Błąd serwera' },
      { status: 500 }
    );
  }
}
