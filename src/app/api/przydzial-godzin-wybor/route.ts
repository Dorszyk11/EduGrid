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
      return NextResponse.json({ przydzial: {}, doradztwo: {} });
    }

    return NextResponse.json({
      przydzial: doc.przydzial ?? {},
      doradztwo: doc.doradztwo ?? {},
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Nieznany błąd';
    console.error('GET /api/przydzial-godzin-wybor:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/przydzial-godzin-wybor
 * Body: { klasaId: string, przydzial?: Record<string, Record<string, number>>, doradztwo?: Record<string, Record<string, number>> }
 * Tworzy lub aktualizuje zapis dla klasy (upsert).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { klasaId, przydzial, doradztwo } = body;
    if (!klasaId) {
      return NextResponse.json({ error: 'klasaId jest wymagane' }, { status: 400 });
    }

    const payload = await getPayload({ config });
    const existing = await payload.find({
      collection: 'przydzial-godzin-wybor',
      where: { klasa: { equals: klasaId } },
      limit: 1,
    });

    const przydzialVal = przydzial != null ? przydzial : {};
    const doradztwoVal = doradztwo != null ? doradztwo : {};

    if (existing.docs.length > 0) {
      const doc = existing.docs[0] as any;
      await payload.update({
        collection: 'przydzial-godzin-wybor',
        id: doc.id,
        data: {
          przydzial: przydzialVal,
          doradztwo: doradztwoVal,
        },
      });
      return NextResponse.json({ ok: true, updated: true });
    }

    await payload.create({
      collection: 'przydzial-godzin-wybor',
      data: {
        klasa: klasaId,
        przydzial: przydzialVal,
        doradztwo: doradztwoVal,
      },
    });
    return NextResponse.json({ ok: true, created: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Nieznany błąd';
    console.error('POST /api/przydzial-godzin-wybor:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
