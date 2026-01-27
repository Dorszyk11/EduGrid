import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

/**
 * GET /api/nauczyciele/[id] - Pobierz szczegóły nauczyciela z obciążeniem
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getPayload({ config });
    const nauczycielId = params.id;

    // Pobierz nauczyciela
    const nauczyciel = await payload.findByID({
      collection: 'nauczyciele',
      id: nauczycielId,
    });

    if (!nauczyciel) {
      return NextResponse.json(
        { error: 'Nauczyciel nie znaleziony' },
        { status: 404 }
      );
    }

    // Pobierz kwalifikacje
    const kwalifikacje = await payload.find({
      collection: 'kwalifikacje',
      where: {
        nauczyciel: {
          equals: nauczycielId,
        },
      },
      limit: 100,
      depth: 1,
    });

    // Pobierz rozkład godzin dla tego nauczyciela
    const rozkladGodzin = await payload.find({
      collection: 'rozkład-godzin',
      where: {
        nauczyciel: {
          equals: nauczycielId,
        },
      },
      limit: 1000,
      depth: 2, // Pobierz powiązane klasy i przedmioty
    });

    // Grupuj po klasach i przedmiotach
    const obciazenie = rozkladGodzin.docs.map((rozklad: any) => {
      const klasa = rozklad.klasa;
      const przedmiot = rozklad.przedmiot;

      return {
        klasa: {
          id: typeof klasa === 'string' ? klasa : klasa.id,
          nazwa: typeof klasa === 'string' ? klasa : klasa.nazwa,
        },
        przedmiot: {
          id: typeof przedmiot === 'string' ? przedmiot : przedmiot.id,
          nazwa: typeof przedmiot === 'string' ? przedmiot : przedmiot.nazwa,
        },
        godziny_tyg: rozklad.godziny_tyg || 0,
        godziny_roczne: rozklad.godziny_roczne || 0,
        rok_szkolny: rozklad.rok_szkolny,
      };
    });

    // Oblicz sumy
    const sumaGodzinTyg = obciazenie.reduce((sum, o) => sum + o.godziny_tyg, 0);
    const sumaGodzinRocznie = obciazenie.reduce((sum, o) => sum + o.godziny_roczne, 0);
    const maxObciazenie = nauczyciel.max_obciazenie || 18;
    const roznica = sumaGodzinTyg - maxObciazenie;
    const procentObciazenia = maxObciazenie > 0 
      ? Math.round((sumaGodzinTyg / maxObciazenie) * 100) 
      : 0;

    // Sprawdź status
    let status = 'OK';
    if (roznica > 0) status = 'PRZECIĄŻENIE';
    else if (sumaGodzinTyg < maxObciazenie * 0.5) status = 'NIEDOCIĄŻENIE';

    return NextResponse.json({
      nauczyciel: {
        id: nauczyciel.id,
        imie: nauczyciel.imie,
        nazwisko: nauczyciel.nazwisko,
        email: nauczyciel.email,
        telefon: nauczyciel.telefon,
        max_obciazenie: maxObciazenie,
        etat: nauczyciel.etat,
        aktywny: nauczyciel.aktywny,
      },
      kwalifikacje: kwalifikacje.docs.map((k: any) => ({
        przedmiot: {
          id: typeof k.przedmiot === 'string' ? k.przedmiot : k.przedmiot.id,
          nazwa: typeof k.przedmiot === 'string' ? k.przedmiot : k.przedmiot.nazwa,
        },
        stopien: k.stopien,
        specjalizacja: k.specjalizacja,
      })),
      obciazenie,
      podsumowanie: {
        suma_godzin_tyg: sumaGodzinTyg,
        suma_godzin_rocznie: sumaGodzinRocznie,
        max_obciazenie: maxObciazenie,
        roznica,
        procent_obciazenia: procentObciazenia,
        status,
        liczba_klas: new Set(obciazenie.map(o => o.klasa.id)).size,
        liczba_przedmiotow: new Set(obciazenie.map(o => o.przedmiot.id)).size,
      },
    });
  } catch (error) {
    console.error('Błąd przy pobieraniu danych nauczyciela:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}
