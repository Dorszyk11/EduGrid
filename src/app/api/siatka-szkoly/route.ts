import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

/**
 * GET /api/siatka-szkoly - Pobiera dane siatki szkoły w formacie tabelarycznym (przedmiot × klasa)
 * 
 * Parametry:
 * - typSzkolyId: ID typu szkoły
 * - rokSzkolny: Rok szkolny (np. 2024/2025)
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

    // Pobierz klasy dla danego typu szkoły
    const klasy = await payload.find({
      collection: 'klasy',
      where: {
        and: [
          {
            typ_szkoly: {
              equals: typSzkolyId,
            },
          },
          {
            rok_szkolny: {
              equals: rokSzkolny,
            },
          },
          {
            aktywna: {
              equals: true,
            },
          },
        ],
      },
      limit: 1000,
      depth: 1,
      sort: 'nazwa',
    });

    // Pobierz rozkład godzin dla tych klas
    const rozkladGodzin = await payload.find({
      collection: 'rozkład-godzin',
      where: {
        and: [
          {
            rok_szkolny: {
              equals: rokSzkolny,
            },
          },
        ],
      },
      limit: 10000,
      depth: 2, // Pobierz powiązane przedmioty, klasy, nauczycieli
    });

    // Filtruj tylko rozkłady dla klas z wybranego typu szkoły
    const klasaIds = klasy.docs.map(k => k.id);
    const rozkladFiltrowany = rozkladGodzin.docs.filter((r: any) => {
      const rKlasa = typeof r.klasa === 'object' ? r.klasa : null;
      return rKlasa && klasaIds.includes(rKlasa.id);
    });

    // Pobierz wszystkie przedmioty (aktywne)
    const przedmioty = await payload.find({
      collection: 'przedmioty',
      where: {
        aktywny: {
          equals: true,
        },
      },
      limit: 1000,
      sort: 'nazwa',
    });

    // Utwórz macierz: przedmiot × klasa
    const macierz: Array<{
      przedmiotId: string;
      przedmiotNazwa: string;
      klasy: Array<{
        klasaId: string;
        klasaNazwa: string;
        godzinyTygodniowo: number;
        godzinyRoczne: number;
        nauczycielId?: string;
        nauczycielNazwa?: string;
        liczbaNauczycieli: number;
      }>;
      sumaGodzinTygodniowo: number;
      sumaGodzinRocznie: number;
    }> = [];

    for (const przedmiot of przedmioty.docs) {
      const klasyPrzedmiotu: Array<{
        klasaId: string;
        klasaNazwa: string;
        godzinyTygodniowo: number;
        godzinyRoczne: number;
        nauczycielId?: string;
        nauczycielNazwa?: string;
        liczbaNauczycieli: number;
      }> = [];

      for (const klasa of klasy.docs) {
        // Znajdź wszystkie przypisania tego przedmiotu w tej klasie
        const przypisania = rozkladFiltrowany.filter((r: any) => {
          const rPrzedmiot = typeof r.przedmiot === 'object' ? r.przedmiot : null;
          const rKlasa = typeof r.klasa === 'object' ? r.klasa : null;
          return rPrzedmiot?.id === przedmiot.id && rKlasa?.id === klasa.id;
        });

        if (przypisania.length > 0) {
          const sumaGodzinTyg = przypisania.reduce((sum: number, r: any) => sum + (r.godziny_tyg || 0), 0);
          const sumaGodzinRocznie = przypisania.reduce((sum: number, r: any) => sum + (r.godziny_roczne || 0), 0);
          
          // Jeśli jest więcej niż jeden nauczyciel, pokaż pierwszego + liczbę
          const pierwszyNauczyciel = przypisania[0];
          const nauczyciel = typeof pierwszyNauczyciel.nauczyciel === 'object' 
            ? pierwszyNauczyciel.nauczyciel 
            : null;

          klasyPrzedmiotu.push({
            klasaId: klasa.id,
            klasaNazwa: klasa.nazwa,
            godzinyTygodniowo: sumaGodzinTyg,
            godzinyRoczne: sumaGodzinRocznie,
            nauczycielId: nauczyciel?.id,
            nauczycielNazwa: nauczyciel ? `${nauczyciel.imie} ${nauczyciel.nazwisko}` : undefined,
            liczbaNauczycieli: przypisania.length,
          });
        } else {
          // Brak przypisania - pokaż 0
          klasyPrzedmiotu.push({
            klasaId: klasa.id,
            klasaNazwa: klasa.nazwa,
            godzinyTygodniowo: 0,
            godzinyRoczne: 0,
            liczbaNauczycieli: 0,
          });
        }
      }

      const sumaGodzinTygodniowo = klasyPrzedmiotu.reduce((sum, k) => sum + k.godzinyTygodniowo, 0);
      const sumaGodzinRocznie = klasyPrzedmiotu.reduce((sum, k) => sum + k.godzinyRoczne, 0);

      // Dodaj tylko jeśli są jakieś godziny lub jeśli chcemy pokazać wszystkie przedmioty
      macierz.push({
        przedmiotId: przedmiot.id,
        przedmiotNazwa: przedmiot.nazwa,
        klasy: klasyPrzedmiotu,
        sumaGodzinTygodniowo,
        sumaGodzinRocznie,
      });
    }

    return NextResponse.json({
      typSzkolyId,
      rokSzkolny,
      klasy: klasy.docs.map(k => ({
        id: k.id,
        nazwa: k.nazwa,
        profil: k.profil || null,
      })),
      przedmioty: przedmioty.docs.map(p => ({
        id: p.id,
        nazwa: p.nazwa,
      })),
      macierz,
    });
  } catch (error) {
    console.error('Błąd przy pobieraniu siatki szkoły:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}
