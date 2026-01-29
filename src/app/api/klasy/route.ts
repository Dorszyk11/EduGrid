import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

/**
 * GET /api/klasy - Lista klas z opcjonalnymi filtrami
 * Parametry: typSzkolyId, rokSzkolny
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typSzkolyId = searchParams.get('typSzkolyId');
    const rokSzkolny = searchParams.get('rokSzkolny');

    const payload = await getPayload({ config });

    const where: Record<string, unknown>[] = [{ aktywna: { equals: true } }];
    if (typSzkolyId) {
      const idTyp = Number(typSzkolyId);
      const typIdValue = !Number.isNaN(idTyp) ? idTyp : typSzkolyId;
      where.push({ typ_szkoly: { equals: typIdValue } });
    }
    if (rokSzkolny) {
      where.push({ rok_szkolny: { equals: rokSzkolny } });
    }

    const result = await payload.find({
      collection: 'klasy',
      where: { and: where },
      limit: 500,
      depth: 1,
    });

    const klasy = result.docs.map((k: any) => ({
      id: k.id,
      nazwa: k.nazwa,
      rok_szkolny: k.rok_szkolny,
      profil: k.profil ?? null,
      typ_szkoly: k.typ_szkoly
        ? {
            id: typeof k.typ_szkoly === 'object' ? k.typ_szkoly.id : k.typ_szkoly,
            nazwa: typeof k.typ_szkoly === 'object' ? k.typ_szkoly.nazwa : undefined,
          }
        : null,
    }));

    return NextResponse.json({ klasy, total: result.totalDocs });
  } catch (error) {
    console.error('Błąd przy pobieraniu listy klas:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nieznany błąd' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/klasy - Utwórz nową klasę
 * Body: { typ_szkoly_id, rok_poczatku, litera, profil? }
 * rok_szkolny zapisywany jako zakres YYYY-YYYY (np. 2022-2027) na podstawie liczba_lat typu szkoły.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { typ_szkoly_id, rok_poczatku, litera, profil } = body;

    if (!typ_szkoly_id || rok_poczatku == null || !litera) {
      return NextResponse.json(
        { error: 'Wymagane: typ_szkoly_id, rok_poczatku, litera' },
        { status: 400 }
      );
    }

    const startYear = Number(rok_poczatku);
    if (Number.isNaN(startYear) || startYear < 2000 || startYear > 2040) {
      return NextResponse.json(
        { error: 'rok_poczatku musi być rokiem 2000–2040' },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    const rawId = typ_szkoly_id;
    let typSzkoly: { id: string | number; nazwa?: string; liczba_lat?: number } | null = null;
    try {
      typSzkoly = await payload.findByID({
        collection: 'typy-szkol',
        id: rawId as string,
      });
    } catch {
      try {
        const numId = Number(rawId);
        if (!Number.isNaN(numId)) {
          typSzkoly = await payload.findByID({
            collection: 'typy-szkol',
            id: numId,
          });
        }
      } catch {
        typSzkoly = null;
      }
    }

    if (!typSzkoly) {
      return NextResponse.json(
        { error: 'Nie znaleziono typu szkoły o podanym ID: ' + String(rawId) },
        { status: 400 }
      );
    }

    const liczbaLat = typSzkoly.liczba_lat ?? 0;
    if (liczbaLat < 1 || liczbaLat > 8) {
      return NextResponse.json(
        { error: 'Typ szkoły musi mieć liczba_lat 1–8' },
        { status: 400 }
      );
    }

    const endYear = startYear + liczbaLat;
    const rokSzkolnyZakres = `${startYear}-${endYear}`;
    const nazwa = String(litera).trim().toUpperCase();

    const data: Record<string, unknown> = {
      nazwa,
      typ_szkoly: typSzkoly.id,
      rok_szkolny: rokSzkolnyZakres,
      aktywna: true,
    };
    if (profil != null && String(profil).trim() !== '') {
      data.profil = String(profil).trim();
    }

    const created = await payload.create({
      collection: 'klasy',
      data: data as Record<string, unknown>,
    });

    const createdId = created.id;
    const verify = await payload.findByID({
      collection: 'klasy',
      id: createdId,
    }).catch(() => null);

    if (!verify) {
      console.warn('Klasa utworzona (id=%s) ale weryfikacja findByID nie zwróciła dokumentu', createdId);
    }

    return NextResponse.json({
      id: created.id,
      nazwa: created.nazwa,
      rok_szkolny: created.rok_szkolny,
      typ_szkoly: created.typ_szkoly,
      created: true,
    });
  } catch (error) {
    console.error('Błąd przy tworzeniu klasy:', error);
    const msg = error instanceof Error ? error.message : 'Nieznany błąd';
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
