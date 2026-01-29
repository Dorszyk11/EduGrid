import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

/** GET /api/przedmioty – lista przedmiotów. */
export async function GET() {
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: 'przedmioty',
      limit: 500,
    });
    const mapped = res.docs.map((p: any) => ({
      id: p.id,
      nazwa: p.nazwa ?? 'Brak nazwy',
      kod_mein: p.kod_mein,
      typ_zajec: p.typ_zajec,
      poziom: p.poziom,
      aktywny: p.aktywny !== false,
    }));
    return NextResponse.json(mapped);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Nieznany błąd';
    console.error('Błąd przy pobieraniu przedmiotów:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/przedmioty – dodaj przedmiot. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nazwa, kod_mein, typ_zajec, poziom, aktywny, jednostka_org } = body ?? {};
    if (!nazwa || !typ_zajec || !poziom) {
      return NextResponse.json(
        { error: 'Wymagane: nazwa, typ_zajec, poziom' },
        { status: 400 }
      );
    }
    const validTyp = ['ogolnoksztalcace', 'zawodowe_teoretyczne', 'zawodowe_praktyczne'].includes(typ_zajec);
    const validPoziom = ['podstawowy', 'rozszerzony', 'brak'].includes(poziom);
    if (!validTyp || !validPoziom) {
      return NextResponse.json(
        { error: 'typ_zajec: ogolnoksztalcace|zawodowe_teoretyczne|zawodowe_praktyczne; poziom: podstawowy|rozszerzony|brak' },
        { status: 400 }
      );
    }
    const payload = await getPayload({ config });
    const created = await payload.create({
      collection: 'przedmioty',
      data: {
        nazwa: String(nazwa).trim(),
        kod_mein: kod_mein != null ? String(kod_mein).trim() : undefined,
        typ_zajec,
        poziom,
        aktywny: aktywny !== false,
        jednostka_org: jednostka_org != null ? String(jednostka_org).trim() : undefined,
      },
    });
    return NextResponse.json({
      id: created.id,
      nazwa: created.nazwa,
      kod_mein: created.kod_mein,
      typ_zajec: created.typ_zajec,
      poziom: created.poziom,
      aktywny: created.aktywny !== false,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Nieznany błąd';
    console.error('Błąd przy dodawaniu przedmiotu:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
