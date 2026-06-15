import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { obliczZgodnoscDlaSzkoly } from '@/utils/zgodnoscMein';
import { automatycznyRozdzialGodzin } from '@/utils/automatycznyRozdzialGodzin';
import { requireUserId, ownerScope } from '@/lib/api/guard';
import { errorResponse } from '@/lib/api/respond';
import { ValidationError } from '@/lib/errors';

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

    // Pobierz zgodność z MEiN
    const zgodnoscMein = await obliczZgodnoscDlaSzkoly(payload, typSzkolyId, rokSzkolny, userId);

    // Pobierz braki kadrowe
    const rozdzial = await automatycznyRozdzialGodzin(payload, {
      typSzkolyId,
      rokSzkolny,
      userId,
    });

    // Pobierz obciążenia nauczycieli (tylko nauczyciele konta)
    const nauczyciele = await payload.find({
      collection: 'nauczyciele',
      where: {
        and: [{ aktywny: { equals: true } }, ownerScope(userId)],
      },
    });

    const obciazenia = [];
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

      const sumaGodzinTyg = rozklady.docs.reduce(
        (sum, r) => sum + (r.godziny_tyg || 0),
        0
      );
      const maxObciazenie = nauczyciel.max_obciazenie || 18;
      const procentWykorzystania = maxObciazenie > 0
        ? (sumaGodzinTyg / maxObciazenie) * 100
        : 0;

      obciazenia.push({
        nauczycielId: nauczyciel.id,
        aktualneObciazenie: sumaGodzinTyg,
        maxObciazenie,
        procentWykorzystania,
      });
    }

    // Oblicz statystyki
    const statystykiZgodnosci = {
      lacznie: zgodnoscMein.length,
      zgodne: zgodnoscMein.filter(w => w.status === 'OK').length,
      zBrakami: zgodnoscMein.filter(w => w.status === 'BRAK').length,
      zNadwyzkami: zgodnoscMein.filter(w => w.status === 'NADWYŻKA').length,
      sredniProcent: zgodnoscMein.length > 0
        ? zgodnoscMein.reduce((sum, w) => sum + w.roznica.procent_realizacji, 0) / zgodnoscMein.length
        : 0,
    };

    const statystykiObciazen = {
      lacznie: obciazenia.length,
      przekroczone: obciazenia.filter(o => o.aktualneObciazenie > o.maxObciazenie).length,
      pelne: obciazenia.filter(o => o.aktualneObciazenie === o.maxObciazenie).length,
      niskie: obciazenia.filter(o => o.procentWykorzystania < 50).length,
      srednieObciazenie: obciazenia.length > 0
        ? obciazenia.reduce((sum, o) => sum + o.aktualneObciazenie, 0) / obciazenia.length
        : 0,
    };

    const statystykiBrakow = {
      lacznie: rozdzial.brakiKadrowe.length,
      laczneGodziny: rozdzial.brakiKadrowe.reduce((sum, b) => sum + b.godzinyTygodniowo, 0),
      wymaganeEtaty: Math.ceil(
        rozdzial.brakiKadrowe.reduce((sum, b) => sum + b.godzinyTygodniowo, 0) / 18
      ),
    };

    return NextResponse.json({
      zgodnoscMein: statystykiZgodnosci,
      obciazenia: statystykiObciazen,
      brakiKadrowe: statystykiBrakow,
      metryki: rozdzial.metryki,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
