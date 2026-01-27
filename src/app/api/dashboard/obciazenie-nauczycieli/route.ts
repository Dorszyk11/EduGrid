import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rokSzkolny = searchParams.get('rokSzkolny') || '2024/2025';

    const payload = await getPayload({ config });

    // Pobierz wszystkich aktywnych nauczycieli
    const nauczyciele = await payload.find({
      collection: 'nauczyciele',
      where: {
        aktywny: {
          equals: true,
        },
      },
    });

    const obciazenia = [];

    for (const nauczyciel of nauczyciele.docs) {
      // Pobierz rozkład godzin
      const rozklady = await payload.find({
        collection: 'rozkład-godzin',
        where: {
          and: [
            {
              nauczyciel: {
                equals: nauczyciel.id,
              },
            },
            {
              rok_szkolny: {
                equals: rokSzkolny,
              },
            },
          ],
        },
        depth: 2,
      });

      const sumaGodzinTyg = rozklady.docs.reduce(
        (sum, r) => sum + (r.godziny_tyg || 0),
        0
      );
      const sumaGodzinRocznych = rozklady.docs.reduce(
        (sum, r) => sum + (r.godziny_roczne || 0),
        0
      );

      const maxObciazenie = nauczyciel.max_obciazenie || 18;
      const procentWykorzystania = maxObciazenie > 0
        ? (sumaGodzinTyg / maxObciazenie) * 100
        : 0;

      const status = sumaGodzinTyg > maxObciazenie
        ? 'PRZEKROCZONE'
        : sumaGodzinTyg === maxObciazenie
        ? 'PEŁNE'
        : procentWykorzystania < 50
        ? 'NISKIE'
        : 'OK';

      obciazenia.push({
        nauczycielId: nauczyciel.id,
        nauczycielNazwa: `${nauczyciel.imie} ${nauczyciel.nazwisko}`,
        maxObciazenie,
        aktualneObciazenie: sumaGodzinTyg,
        dostepneObciazenie: Math.max(0, maxObciazenie - sumaGodzinTyg),
        godzinyRoczne: sumaGodzinRocznych,
        procentWykorzystania,
        status,
        liczbaPrzypisan: rozklady.docs.length,
        przedmioty: rozklady.docs.map(r => {
          const przedmiot = typeof r.przedmiot === 'object' ? r.przedmiot : null;
          return przedmiot?.nazwa || 'Nieznany';
        }),
      });
    }

    // Sortuj według obciążenia (najwyższe na górze)
    obciazenia.sort((a, b) => b.aktualneObciazenie - a.aktualneObciazenie);

    // Statystyki
    const statystyki = {
      lacznie: obciazenia.length,
      przekroczone: obciazenia.filter(o => o.status === 'PRZEKROCZONE').length,
      pelne: obciazenia.filter(o => o.status === 'PEŁNE').length,
      niskie: obciazenia.filter(o => o.status === 'NISKIE').length,
      srednieObciazenie: obciazenia.length > 0
        ? obciazenia.reduce((sum, o) => sum + o.aktualneObciazenie, 0) / obciazenia.length
        : 0,
      laczneGodziny: obciazenia.reduce((sum, o) => sum + o.aktualneObciazenie, 0),
    };

    return NextResponse.json({
      obciazenia,
      statystyki,
    });
  } catch (error) {
    console.error('Błąd przy pobieraniu obciążeń:', error);
    return NextResponse.json(
      { error: 'Błąd serwera' },
      { status: 500 }
    );
  }
}
