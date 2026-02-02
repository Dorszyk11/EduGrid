import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

/**
 * GET /api/przydzial-godzin-wybor?klasaId=xxx
 * Zwraca przydział godzin do wyboru i doradztwo dla danej klasy.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const klasaId = searchParams.get('klasaId');
    if (!klasaId) {
      return NextResponse.json({ error: 'klasaId jest wymagane' }, { status: 400 });
    }

    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: 'przydzial-godzin-wybor',
      where: { klasa: { equals: klasaId } },
      limit: 1,
    });

    const doc = result.docs[0] as any;
    if (!doc) {
      return NextResponse.json({ przydzial: {}, doradztwo: {}, dyrektor: {}, rozszerzenia: [], rozszerzeniaGodziny: {}, rozszerzeniaPrzydzial: {} });
    }

    const rozszerzenia = doc.rozszerzenia;
    const rozszerzeniaArr = Array.isArray(rozszerzenia) ? rozszerzenia : [];
    const rozszerzeniaPrzydzial = doc.rozszerzeniaPrzydzial && typeof doc.rozszerzeniaPrzydzial === 'object' ? doc.rozszerzeniaPrzydzial : {};
    const rozszerzeniaGodzinyRaw = doc.rozszerzeniaGodziny && typeof doc.rozszerzeniaGodziny === 'object' ? doc.rozszerzeniaGodziny : {};
    const rozszerzeniaSet = new Set(rozszerzeniaArr);
    const byGrade: Record<string, number> = {};
    if (Object.keys(rozszerzeniaPrzydzial).length > 0) {
      for (const subKey of Object.keys(rozszerzeniaPrzydzial)) {
        if (!rozszerzeniaSet.has(subKey)) continue;
        const byG = rozszerzeniaPrzydzial[subKey];
        if (typeof byG !== 'object' || !byG) continue;
        for (const [g, n] of Object.entries(byG)) {
          if (typeof n === 'number') byGrade[g] = (byGrade[g] ?? 0) + n;
        }
      }
    }
    const rozszerzeniaGodziny = Object.keys(byGrade).length > 0 ? byGrade : rozszerzeniaGodzinyRaw;

    return NextResponse.json({
      przydzial: doc.przydzial ?? {},
      doradztwo: doc.doradztwo ?? {},
      dyrektor: doc.dyrektor ?? {},
      rozszerzenia: rozszerzeniaArr,
      rozszerzeniaGodziny: rozszerzeniaGodziny,
      rozszerzeniaPrzydzial: rozszerzeniaPrzydzial,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Nieznany błąd';
    console.error('GET /api/przydzial-godzin-wybor:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/przydzial-godzin-wybor
 * Body: { klasaId: string, przydzial?, doradztwo?, dyrektor?, rozszerzenia?, rozszerzeniaGodziny?, rozszerzeniaPrzydzial? }
 * Tworzy lub aktualizuje zapis dla klasy (upsert). Gdy podane rozszerzenia – rozszerzeniaPrzydzial jest filtrowane do kluczy z listy (godziny odznaczonego przedmiotu znikają z puli).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { klasaId, przydzial, doradztwo, dyrektor, rozszerzenia, rozszerzeniaGodziny, rozszerzeniaPrzydzial } = body;
    if (!klasaId) {
      return NextResponse.json({ error: 'klasaId jest wymagane' }, { status: 400 });
    }

    const payload = await getPayload({ config });
    const existing = await payload.find({
      collection: 'przydzial-godzin-wybor',
      where: { klasa: { equals: klasaId } },
      limit: 1,
    });

    const rozszerzeniaArr = Array.isArray(rozszerzenia) ? rozszerzenia : [];
    const rozszerzeniaGodzinyVal =
      rozszerzeniaGodziny != null && typeof rozszerzeniaGodziny === 'object' ? rozszerzeniaGodziny : {};
    const rozszerzeniaPrzydzialVal =
      rozszerzeniaPrzydzial != null && typeof rozszerzeniaPrzydzial === 'object' ? rozszerzeniaPrzydzial : {};

    if (existing.docs.length > 0) {
      const doc = existing.docs[0] as any;
      const przydzialVal = przydzial != null ? przydzial : (doc.przydzial ?? {});
      const doradztwoVal = doradztwo != null ? doradztwo : (doc.doradztwo ?? {});
      const dyrektorVal = dyrektor != null ? dyrektor : (doc.dyrektor ?? {});
      const rozszerzeniaVal = rozszerzenia !== undefined ? rozszerzeniaArr : (Array.isArray(doc.rozszerzenia) ? doc.rozszerzenia : []);
      let rozszerzeniaPrzydzialFinal: Record<string, Record<string, number>> =
        rozszerzeniaPrzydzial !== undefined
          ? rozszerzeniaPrzydzialVal
          : (doc.rozszerzeniaPrzydzial && typeof doc.rozszerzeniaPrzydzial === 'object' ? doc.rozszerzeniaPrzydzial : {});
      if (rozszerzenia !== undefined && rozszerzeniaPrzydzial === undefined) {
        const set = new Set(rozszerzeniaVal);
        rozszerzeniaPrzydzialFinal = Object.fromEntries(
          Object.entries(rozszerzeniaPrzydzialFinal).filter(([k]) => set.has(k))
        ) as Record<string, Record<string, number>>;
      }
      const rozszerzeniaGodzinyFinal =
        rozszerzeniaGodziny !== undefined ? rozszerzeniaGodzinyVal : (() => {
          const set = new Set(rozszerzeniaVal);
          const byGrade: Record<string, number> = {};
          for (const [subKey, byG] of Object.entries(rozszerzeniaPrzydzialFinal)) {
            if (!set.has(subKey) || typeof byG !== 'object' || !byG) continue;
            for (const [g, n] of Object.entries(byG)) {
              if (typeof n === 'number') byGrade[g] = (byGrade[g] ?? 0) + n;
            }
          }
          return byGrade;
        })();
      await payload.update({
        collection: 'przydzial-godzin-wybor',
        id: doc.id,
        data: {
          przydzial: przydzialVal,
          doradztwo: doradztwoVal,
          dyrektor: dyrektorVal,
          rozszerzenia: rozszerzeniaVal,
          rozszerzeniaGodziny: rozszerzeniaGodzinyFinal,
          rozszerzeniaPrzydzial: rozszerzeniaPrzydzialFinal,
        },
      });
      return NextResponse.json({ ok: true, updated: true });
    }

    const przydzialVal = przydzial != null ? przydzial : {};
    const doradztwoVal = doradztwo != null ? doradztwo : {};
    const dyrektorVal = dyrektor != null ? dyrektor : {};
    const rozszerzeniaPrzydzialCreate =
      rozszerzenia !== undefined
        ? Object.fromEntries(Object.entries(rozszerzeniaPrzydzialVal).filter(([k]) => rozszerzeniaArr.includes(k))) as Record<string, Record<string, number>>
        : rozszerzeniaPrzydzialVal;
    const rozszerzeniaGodzinyCreate =
      rozszerzeniaGodziny !== undefined ? rozszerzeniaGodzinyVal : (() => {
        const set = new Set(rozszerzeniaArr);
        const byGrade: Record<string, number> = {};
        for (const [subKey, byG] of Object.entries(rozszerzeniaPrzydzialCreate)) {
          if (!set.has(subKey) || typeof byG !== 'object' || !byG) continue;
          for (const [g, n] of Object.entries(byG)) {
            if (typeof n === 'number') byGrade[g] = (byGrade[g] ?? 0) + n;
          }
        }
        return byGrade;
      })();
    await payload.create({
      collection: 'przydzial-godzin-wybor',
      data: {
        klasa: klasaId,
        przydzial: przydzialVal,
        doradztwo: doradztwoVal,
        dyrektor: dyrektorVal,
        rozszerzenia: rozszerzeniaArr,
        rozszerzeniaGodziny: rozszerzeniaGodzinyCreate,
        rozszerzeniaPrzydzial: rozszerzeniaPrzydzialCreate,
      },
    });
    return NextResponse.json({ ok: true, created: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Nieznany błąd';
    console.error('POST /api/przydzial-godzin-wybor:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
