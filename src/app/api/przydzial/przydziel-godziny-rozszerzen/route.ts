import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import plansData from '@/utils/import/ramowe-plany.json';
import { requireUserId } from '@/lib/api/guard';
import { assertKlasaAccess } from '@/lib/api/klasa-scope';
import { errorResponse } from '@/lib/api/respond';
import { ValidationError } from '@/lib/errors';
import type { HoursByGrade, PlanMein } from '@/lib/przydzial/typy';
import { getGrades, getLimityRozszerzenNaRok, matchSchoolType } from '@/lib/przydzial/plany-mein';
import { rozdzielRozszerzenia } from '@/lib/przydzial/godziny';

const data = plansData as { plans?: PlanMein[]; reference_plans?: PlanMein[] };
const allPlans: PlanMein[] = data.plans ?? data.reference_plans ?? [];

/**
 * POST /api/przydzial/przydziel-godziny-rozszerzen
 * Godziny rozszerzeń są łączne dla wszystkich przedmiotów – jedna pula z limitami na rok.
 * Przydziela tę pulę między przedmioty oznaczone jako rozszerzone (round‑robin na rok).
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    let klasaId = '';
    let typSzkolyId = '';

    try {
      const body = (await request.json()) as Record<string, unknown>;
      klasaId = (body?.klasaId != null ? String(body.klasaId) : '').trim();
      typSzkolyId = (body?.typSzkolyId != null ? String(body.typSzkolyId) : '').trim();
    } catch {
      //
    }

    const { searchParams } = new URL(request.url);
    if (!klasaId) klasaId = (searchParams.get('klasaId') ?? '').trim();
    if (!typSzkolyId) typSzkolyId = (searchParams.get('typSzkolyId') ?? '').trim();

    if (!klasaId || !typSzkolyId) {
      throw new ValidationError('klasaId i typSzkolyId są wymagane (body JSON lub query)');
    }

    const payload = await getPayload({ config });

    // Izolacja per-konto: klasa musi należeć do konta (lub być legacy bez właściciela)
    await assertKlasaAccess(payload, /^\d+$/.test(klasaId) ? Number(klasaId) : klasaId, userId);

    const typSzkoly = await payload
      .findByID({ collection: 'typy-szkol', id: typSzkolyId })
      .catch(() => null);
    const nazwaTypuSzkoly = (typSzkoly as { nazwa?: string } | null)?.nazwa?.trim() ?? '';
    if (!nazwaTypuSzkoly) {
      return NextResponse.json(
        { error: 'Nie znaleziono typu szkoły o podanym ID' },
        { status: 400 }
      );
    }

    const plans = allPlans.filter((p) => matchSchoolType(nazwaTypuSzkoly, p.school_type));
    if (plans.length === 0) {
      return NextResponse.json(
        { error: `Brak planu MEiN dla typu „${nazwaTypuSzkoly}` },
        { status: 400 }
      );
    }

    const klasaIdForRelation = /^\d+$/.test(klasaId) ? Number(klasaId) : klasaId;
    const existing = await payload.find({
      collection: 'przydzial-godzin-wybor',
      where: { klasa: { equals: klasaIdForRelation } },
      limit: 1,
    });

    const currentDoc = existing.docs[0] as {
      id: string;
      przydzial?: Record<string, HoursByGrade>;
      doradztwo?: Record<string, HoursByGrade>;
      dyrektor?: Record<string, HoursByGrade>;
      rozszerzenia?: string[];
    } | undefined;

    const currentPrzydzial = currentDoc?.przydzial && typeof currentDoc.przydzial === 'object' ? currentDoc.przydzial : {};
    const currentDoradztwo = currentDoc?.doradztwo && typeof currentDoc.doradztwo === 'object' ? currentDoc.doradztwo : {};
    const dyrektorVal = currentDoc?.dyrektor ?? {};
    const rozszerzeniaArr = Array.isArray(currentDoc?.rozszerzenia) ? currentDoc.rozszerzenia : [];
    const rozszerzeniaSet = new Set(rozszerzeniaArr);
    const extendedKeysOrdered = rozszerzeniaArr.filter((k) => rozszerzeniaSet.has(k));

    const limityNaRok = getLimityRozszerzenNaRok(plans);
    const gradesOrder = plans[0] ? getGrades(plans[0]) : [];

    const przydzialUzupelniony = rozdzielRozszerzenia(
      currentPrzydzial,
      extendedKeysOrdered,
      limityNaRok,
      gradesOrder
    );

    if (existing.docs.length > 0 && currentDoc) {
      await payload.update({
        collection: 'przydzial-godzin-wybor',
        id: currentDoc.id,
        data: {
          przydzial: przydzialUzupelniony,
          doradztwo: currentDoradztwo,
          dyrektor: dyrektorVal,
          rozszerzenia: rozszerzeniaArr,
        },
      });
    } else {
      // Klasa zweryfikowana wcześniej przez assertKlasaAccess (istnieje i należy do konta)
      await payload.create({
        collection: 'przydzial-godzin-wybor',
        data: {
          klasa: klasaIdForRelation,
          przydzial: przydzialUzupelniony,
          doradztwo: currentDoradztwo,
          dyrektor: dyrektorVal,
          rozszerzenia: rozszerzeniaArr,
        },
      });
    }

    const liczbaPrzedmiotow = Object.keys(przydzialUzupelniony).filter((k) => rozszerzeniaSet.has(k)).length;
    return NextResponse.json({
      success: true,
      komunikat: `Przydzielono godziny rozszerzeń (na podstawie limitów na rok) do ${liczbaPrzedmiotow} przedmiotów.`,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
