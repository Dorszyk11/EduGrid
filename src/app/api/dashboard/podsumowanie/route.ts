import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { obliczZgodnoscDlaSzkoly } from '@/utils/zgodnoscMein';
import { automatycznyRozdzialGodzin } from '@/utils/automatycznyRozdzialGodzin';
import { requireUserId, ownerScope } from '@/lib/api/guard';
import { errorResponse } from '@/lib/api/respond';
import { ValidationError } from '@/lib/errors';
import type { RozkladRow } from '@/types/domain';

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

    // Jedno zapytanie zamiast N+1: wszystkie rozkłady nauczycieli konta, agregacja w pamięci.
    const teacherIds = nauczyciele.docs.map((n) => n.id);
    const sumaByNauczyciel = new Map<string, number>();
    if (teacherIds.length > 0) {
      const rozklady = await payload.find({
        collection: 'rozkład-godzin',
        where: {
          and: [
            { nauczyciel: { in: teacherIds } },
            { rok_szkolny: { equals: rokSzkolny } },
          ],
        },
        limit: 10000,
        depth: 0,
      });
      for (const r of rozklady.docs as unknown as RozkladRow[]) {
        const ref = r.nauczyciel;
        const nid = typeof ref === 'object' && ref !== null ? String(ref.id) : String(ref ?? '');
        if (!nid) continue;
        sumaByNauczyciel.set(nid, (sumaByNauczyciel.get(nid) ?? 0) + (r.godziny_tyg || 0));
      }
    }

    const obciazenia = nauczyciele.docs.map((nauczyciel) => {
      const sumaGodzinTyg = sumaByNauczyciel.get(String(nauczyciel.id)) ?? 0;
      const maxObciazenie = nauczyciel.max_obciazenie || 18;
      const procentWykorzystania = maxObciazenie > 0
        ? (sumaGodzinTyg / maxObciazenie) * 100
        : 0;
      return {
        nauczycielId: nauczyciel.id,
        aktualneObciazenie: sumaGodzinTyg,
        maxObciazenie,
        procentWykorzystania,
      };
    });

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
