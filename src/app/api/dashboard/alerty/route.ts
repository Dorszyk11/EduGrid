import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { requireUserId, ownerScope } from '@/lib/api/guard';
import { ownedIds } from '@/lib/api/klasa-scope';
import { errorResponse } from '@/lib/api/respond';
import { ValidationError } from '@/lib/errors';

/**
 * GET /api/dashboard/alerty - Pobiera wszystkie alerty dla dashboardu
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

    // Klasy konta — do ograniczenia zapytań o rozkład (rozkład jest dzieckiem klasy)
    const klasaIds = [...(await ownedIds(payload, 'klasy', userId))];
    const alerty: Array<{
      typ: 'error' | 'warning' | 'info';
      kategoria: string;
      tytul: string;
      opis: string;
      link?: string;
      priorytet: number; // 1-10, gdzie 10 = najwyższy
    }> = [];

    // 1. Alerty braków kadrowych
    const { automatycznyRozdzialGodzin } = await import('@/utils/automatycznyRozdzialGodzin');
    const rozdzial = await automatycznyRozdzialGodzin(payload, {
      typSzkolyId,
      rokSzkolny,
      userId,
    });

    if (rozdzial.brakiKadrowe.length > 0) {
      alerty.push({
        typ: 'error',
        kategoria: 'braki-kadrowe',
        tytul: `⚠️ Braki kadrowe: ${rozdzial.brakiKadrowe.length} przedmiotów bez nauczycieli`,
        opis: `Wymagane jest zatrudnienie nauczycieli dla ${rozdzial.brakiKadrowe.length} przedmiotów/klas`,
        link: '/raporty/braki-kadrowe',
        priorytet: 10,
      });
    }

    // 2. Alerty przekroczeń obciążeń (tylko nauczyciele konta)
    const nauczyciele = await payload.find({
      collection: 'nauczyciele',
      where: {
        and: [{ aktywny: { equals: true } }, ownerScope(userId)],
      },
      limit: 1000,
    });

    interface PrzekroczenieObciazenia {
      nauczyciel: string;
      przekroczenie: number;
    }
    const przekroczenia: PrzekroczenieObciazenia[] = [];
    for (const nauczyciel of nauczyciele.docs) {
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
      });

      const sumaGodzin = rozklady.docs.reduce((sum, r) => sum + (r.godziny_tyg || 0), 0);
      const maxObciazenie = nauczyciel.max_obciazenie || 18;

      if (sumaGodzin > maxObciazenie) {
        przekroczenia.push({
          nauczyciel: `${nauczyciel.imie} ${nauczyciel.nazwisko}`,
          przekroczenie: sumaGodzin - maxObciazenie,
        });
      }
    }

    if (przekroczenia.length > 0) {
      alerty.push({
        typ: 'error',
        kategoria: 'przekroczenia',
        tytul: `❌ Przekroczenia obciążeń: ${przekroczenia.length} nauczycieli`,
        opis: `${przekroczenia.length} nauczycieli przekroczyło maksymalne obciążenie`,
        link: '/raporty/obciazenia',
        priorytet: 9,
      });
    }

    // 3. Alerty kwalifikacji (tylko rozkład klas konta)
    const rozklady = await payload.find({
      collection: 'rozkład-godzin',
      where: {
        and: [
          { rok_szkolny: { equals: rokSzkolny } },
          { klasa: { in: klasaIds } },
        ],
      },
      depth: 2,
      limit: 10000,
    });

    interface BrakujacaKwalifikacja {
      nauczyciel: string;
      przedmiot: string;
    }
    const brakujaceKwalifikacje: BrakujacaKwalifikacja[] = [];
    for (const rozklad of rozklady.docs) {
      const nauczycielId = typeof rozklad.nauczyciel === 'object' 
        ? rozklad.nauczyciel.id 
        : rozklad.nauczyciel;
      const przedmiotId = typeof rozklad.przedmiot === 'object' 
        ? rozklad.przedmiot.id 
        : rozklad.przedmiot;

      const kwalifikacje = await payload.find({
        collection: 'kwalifikacje',
        where: {
          and: [
            {
              nauczyciel: {
                equals: nauczycielId,
              },
            },
            {
              przedmiot: {
                equals: przedmiotId,
              },
            },
            {
              aktywne: {
                equals: true,
              },
            },
          ],
        },
        limit: 1,
      });

      if (kwalifikacje.docs.length === 0) {
        const nauczyciel = typeof rozklad.nauczyciel === 'object' 
          ? rozklad.nauczyciel 
          : await payload.findByID({ collection: 'nauczyciele', id: nauczycielId });
        const przedmiot = typeof rozklad.przedmiot === 'object' 
          ? rozklad.przedmiot 
          : await payload.findByID({ collection: 'przedmioty', id: przedmiotId });

        brakujaceKwalifikacje.push({
          nauczyciel: nauczyciel ? `${nauczyciel.imie} ${nauczyciel.nazwisko}` : 'Nieznany',
          przedmiot: przedmiot?.nazwa || 'Nieznany',
        });
      }
    }

    if (brakujaceKwalifikacje.length > 0) {
      alerty.push({
        typ: 'warning',
        kategoria: 'kwalifikacje',
        tytul: `⚠️ Brakujące kwalifikacje: ${brakujaceKwalifikacje.length} przypisań`,
        opis: `${brakujaceKwalifikacje.length} przypisań nie ma potwierdzonych kwalifikacji`,
        link: '/panel-admin',
        priorytet: 7,
      });
    }

    // 4. Alerty niedociążenia
    interface NiedociążonyNauczyciel {
      nauczyciel: string;
      wykorzystanie: number;
    }
    const niedociążeni: NiedociążonyNauczyciel[] = [];
    for (const nauczyciel of nauczyciele.docs) {
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
      });

      const sumaGodzin = rozklady.docs.reduce((sum, r) => sum + (r.godziny_tyg || 0), 0);
      const maxObciazenie = nauczyciel.max_obciazenie || 18;
      const procentWykorzystania = maxObciazenie > 0 ? (sumaGodzin / maxObciazenie) * 100 : 0;

      if (procentWykorzystania < 50 && sumaGodzin > 0) {
        niedociążeni.push({
          nauczyciel: `${nauczyciel.imie} ${nauczyciel.nazwisko}`,
          wykorzystanie: procentWykorzystania,
        });
      }
    }

    if (niedociążeni.length > 0) {
      alerty.push({
        typ: 'warning',
        kategoria: 'niedociążenie',
        tytul: `⚠️ Niedociążenie: ${niedociążeni.length} nauczycieli`,
        opis: `${niedociążeni.length} nauczycieli ma obciążenie poniżej 50%`,
        link: '/raporty/obciazenia',
        priorytet: 5,
      });
    }

    // 5. Alerty zgodności MEiN
    const { obliczZgodnoscDlaSzkoly } = await import('@/utils/zgodnoscMein');
    const zgodnosc = await obliczZgodnoscDlaSzkoly(payload, typSzkolyId, rokSzkolny, userId);
    const brakiMein = zgodnosc.filter(w => w.status === 'BRAK');

    if (brakiMein.length > 0) {
      alerty.push({
        typ: 'error',
        kategoria: 'zgodnosc-mein',
        tytul: `❌ Braki zgodności MEiN: ${brakiMein.length} przedmiotów/klas`,
        opis: `${brakiMein.length} przedmiotów/klas nie spełnia wymagań MEiN`,
        link: '/raporty/zgodnosc-mein',
        priorytet: 8,
      });
    }

    // Sortuj według priorytetu (wyższy = ważniejszy)
    alerty.sort((a, b) => b.priorytet - a.priorytet);

    return NextResponse.json({
      alerty,
      statystyki: {
        lacznie: alerty.length,
        bledy: alerty.filter(a => a.typ === 'error').length,
        ostrzezenia: alerty.filter(a => a.typ === 'warning').length,
        informacje: alerty.filter(a => a.typ === 'info').length,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
