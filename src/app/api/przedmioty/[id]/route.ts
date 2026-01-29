import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

/**
 * GET /api/przedmioty/[id] - Pobierz szczegóły przedmiotu z podziałem na klasy
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: przedmiotId } = await params;
    const payload = await getPayload({ config });

    // Pobierz przedmiot
    const przedmiot = await payload.findByID({
      collection: 'przedmioty',
      id: przedmiotId,
    });

    if (!przedmiot) {
      return NextResponse.json(
        { error: 'Przedmiot nie znaleziony' },
        { status: 404 }
      );
    }

    // Pobierz rozkład godzin dla tego przedmiotu
    const rozkladGodzin = await payload.find({
      collection: 'rozkład-godzin',
      where: {
        przedmiot: {
          equals: przedmiotId,
        },
      },
      limit: 1000,
      depth: 2, // Pobierz powiązane klasy i nauczycieli
    });

    // Grupuj po klasach
    const klasyZgodnosc = rozkladGodzin.docs.reduce((acc: any, rozklad: any) => {
      const klasa = rozklad.klasa;
      const klasaId = typeof klasa === 'string' ? klasa : klasa.id;
      const klasaNazwa = typeof klasa === 'string' ? klasa : klasa.nazwa;

      if (!acc[klasaId]) {
        acc[klasaId] = {
          klasa: {
            id: klasaId,
            nazwa: klasaNazwa,
            profil: typeof klasa === 'string' ? '' : klasa.profil,
          },
          nauczyciele: [],
          godziny_tyg: 0,
          godziny_roczne: 0,
        };
      }

      const nauczyciel = rozklad.nauczyciel;
      if (nauczyciel) {
        acc[klasaId].nauczyciele.push({
          id: typeof nauczyciel === 'string' ? nauczyciel : nauczyciel.id,
          imie: typeof nauczyciel === 'string' ? '' : nauczyciel.imie,
          nazwisko: typeof nauczyciel === 'string' ? '' : nauczyciel.nazwisko,
          godziny_tyg: rozklad.godziny_tyg || 0,
          godziny_roczne: rozklad.godziny_roczne || 0,
        });
      }

      acc[klasaId].godziny_tyg += rozklad.godziny_tyg || 0;
      acc[klasaId].godziny_roczne += rozklad.godziny_roczne || 0;

      return acc;
    }, {});

    const klasyArray = Object.values(klasyZgodnosc);

    // Oblicz sumy
    const lacznaGodziny = klasyArray.reduce((sum: number, k: any) => sum + k.godziny_roczne, 0);
    const liczbaKlas = klasyArray.length;
    const liczbaNauczycieli = new Set(
      klasyArray.flatMap((k: any) => k.nauczyciele.map((n: any) => n.id))
    ).size;

    return NextResponse.json({
      przedmiot: {
        id: przedmiot.id,
        nazwa: przedmiot.nazwa,
        kod_mein: przedmiot.kod_mein,
        typ_zajec: przedmiot.typ_zajec,
        poziom: przedmiot.poziom,
      },
      klasy: klasyArray,
      podsumowanie: {
        laczna_godziny: lacznaGodziny,
        liczba_klas: liczbaKlas,
        liczba_nauczycieli: liczbaNauczycieli,
      },
    });
  } catch (error) {
    console.error('Błąd przy pobieraniu danych przedmiotu:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}

/** DELETE /api/przedmioty/[id] – usuń przedmiot. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = await getPayload({ config });
    await payload.delete({ collection: 'przedmioty', id });
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isFk = /foreign key|violates foreign key|referential integrity/i.test(msg);
    const isNotFound = /not found|Unknown id/i.test(msg);
    console.error('Błąd przy usuwaniu przedmiotu:', msg);
    if (isNotFound) {
      return NextResponse.json({ error: 'Przedmiot nie znaleziony.' }, { status: 404 });
    }
    if (isFk) {
      return NextResponse.json(
        { error: 'Nie można usunąć: przedmiot ma powiązane dane (rozkłady, siatki MEiN itd.).' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
