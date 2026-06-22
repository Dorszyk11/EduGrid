import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import { z } from 'zod';
import config from '@/payload.config';
import plansData from '@/data/ramowe-plany.json';
import { requireUserId } from '@/lib/api/guard';
import { assertKlasaAccess } from '@/lib/api/klasa-scope';
import { errorResponse } from '@/lib/api/respond';
import { validateInput } from '@/lib/validation';
import type { HoursByGrade, PlanMein, SubjectRow } from '@/lib/przydzial/typy';
import { getGrades, isDirectorRow, isPrzedmiotLaczny, matchSchoolType, subjectKey } from '@/lib/przydzial/plany-mein';
import { uzupelnijNierozdysponowane } from '@/lib/przydzial/godziny';

const data = plansData as { plans?: PlanMein[]; reference_plans?: PlanMein[] };
const allPlans: PlanMein[] = data.plans ?? data.reference_plans ?? [];

const generujSchema = z.object({
  klasaId: z.string().trim().min(1, 'klasaId jest wymagane (body JSON lub query)'),
  typSzkolyId: z.string().trim().min(1, 'typSzkolyId jest wymagane (body JSON lub query)'),
});

/**
 * POST /api/przydzial/generuj - Przydziela godziny do wyboru do przedmiotów po kolei (po latach).
 * Body: { klasaId: string, typSzkolyId: string } lub query: ?klasaId=...&typSzkolyId=...
 * Zapisuje wynik do przydzial-godzin-wybor (pole przydzial).
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
      // Body pusty lub nie JSON – weź z query
    }

    const { searchParams } = new URL(request.url);
    if (!klasaId) klasaId = (searchParams.get('klasaId') ?? '').trim();
    if (!typSzkolyId) typSzkolyId = (searchParams.get('typSzkolyId') ?? '').trim();

    ({ klasaId, typSzkolyId } = validateInput(generujSchema, { klasaId, typSzkolyId }));

    const payload = await getPayload({ config });

    // Izolacja per-konto: klasa musi należeć do konta (lub być legacy bez właściciela)
    await assertKlasaAccess(payload, /^\d+$/.test(klasaId) ? Number(klasaId) : klasaId, userId);

    const typSzkoly = await payload.findByID({
      collection: 'typy-szkol',
      id: typSzkolyId,
    }).catch(() => null);
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
        { error: `Brak planu MEiN dla typu „${nazwaTypuSzkoly}”. Sprawdź ramowe-plany.json.` },
        { status: 400 }
      );
    }

    // ID klasy dla relacji – Payload/PostgreSQL może wymagać number
    const klasaIdForRelation = /^\d+$/.test(klasaId) ? Number(klasaId) : klasaId;

    const existing = await payload.find({
      collection: 'przydzial-godzin-wybor',
      where: { klasa: { equals: klasaIdForRelation } },
      limit: 1,
    });

    const currentDoc = existing.docs[0] as { id: string; przydzial?: Record<string, HoursByGrade>; doradztwo?: Record<string, HoursByGrade>; dyrektor?: Record<string, HoursByGrade> } | undefined;
    const currentPrzydzial = currentDoc?.przydzial && typeof currentDoc.przydzial === 'object' ? currentDoc.przydzial : {};
    const currentDoradztwo = currentDoc?.doradztwo && typeof currentDoc.doradztwo === 'object' ? currentDoc.doradztwo : {};
    const dyrektorVal = currentDoc?.dyrektor ?? {};

    // Uzupełnij tylko nierozdysponowane godziny – już przydzielone zostaw, resztę wpisz optymalnie (najpierw zera)
    const przydzialNowy: Record<string, HoursByGrade> = {};
    const doradztwoNowy: Record<string, HoursByGrade> = {};
    for (const plan of plans) {
      const grades = getGrades(plan);
      for (const entry of plan.subjects) {
        if (isDirectorRow(entry)) continue;
        const row = entry as SubjectRow;
        const subject = row.subject ?? '';
        if (isPrzedmiotLaczny(subject)) {
          const totalHours = row.total_hours ?? 0;
          if (totalHours <= 0) continue;
          const key = subjectKey(plan.plan_id, subject);
          const current = currentDoradztwo[key] ?? {};
          doradztwoNowy[key] = uzupelnijNierozdysponowane(current, totalHours, grades);
          continue;
        }
        const hoursToChoose = row.hours_to_choose ?? 0;
        if (hoursToChoose <= 0) continue;
        const key = subjectKey(plan.plan_id, subject);
        const current = currentPrzydzial[key] ?? {};
        przydzialNowy[key] = uzupelnijNierozdysponowane(current, hoursToChoose, grades);
      }
    }

    const mergedPrzydzial = { ...currentPrzydzial, ...przydzialNowy };
    const mergedDoradztwo = { ...currentDoradztwo, ...doradztwoNowy };

    if (existing.docs.length > 0) {
      await payload.update({
        collection: 'przydzial-godzin-wybor',
        id: currentDoc!.id,
        data: {
          przydzial: mergedPrzydzial,
          doradztwo: mergedDoradztwo,
          dyrektor: dyrektorVal,
        },
      });
    } else {
      // Klasa zweryfikowana wcześniej przez assertKlasaAccess (istnieje i należy do konta)
      await payload.create({
        collection: 'przydzial-godzin-wybor',
        data: {
          klasa: klasaIdForRelation,
          przydzial: mergedPrzydzial,
          doradztwo: mergedDoradztwo,
          dyrektor: dyrektorVal,
        },
      });
    }

    const liczbaPrzedmiotow = Object.keys(przydzialNowy).length;
    const liczbaDoradztwo = Object.keys(doradztwoNowy).length;
    const parts = [`${liczbaPrzedmiotow} przedmiotów (godz. do wyboru)`];
    if (liczbaDoradztwo > 0) parts.push(`zajęcia z zakresu doradztwa zawodowego (${liczbaDoradztwo})`);
    return NextResponse.json({
      success: true,
      przydzial: mergedPrzydzial,
      doradztwo: mergedDoradztwo,
      komunikat: `Przydzielono po latach po kolei: ${parts.join(', ')}.`,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
