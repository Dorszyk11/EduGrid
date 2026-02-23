import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import plansData from '@/utils/import/ramowe-plany.json';

type HoursByGrade = Record<string, number>;
type SubjectRow = {
  subject?: string;
  hours_to_choose?: number;
  total_hours?: number;
  hours_by_grade?: HoursByGrade;
};
type DirectorRow = { director_discretion_hours?: { total_hours: number } };
type PlanMein = {
  plan_id?: string;
  school_type: string;
  cycle: string;
  grades?: string[];
  table_structure?: { grades?: string[] };
  subjects: (SubjectRow | DirectorRow)[];
};

const data = plansData as { plans?: PlanMein[]; reference_plans?: PlanMein[] };
const allPlans: PlanMein[] = data.plans ?? data.reference_plans ?? [];

function matchSchoolType(nazwaTypu: string, schoolType: string): boolean {
  const a = (nazwaTypu || '').trim().toLowerCase();
  const b = (schoolType || '').trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.startsWith(b) && (a.length === b.length || a.charAt(b.length) === ',')) return true;
  return false;
}

function isDirectorRow(entry: SubjectRow | DirectorRow): entry is DirectorRow {
  return 'director_discretion_hours' in entry && !('subject' in entry);
}

const PRZEDMIOTY_LACZNE_CYKL = ['Zajęcia z zakresu doradztwa zawodowego'];
function isPrzedmiotLaczny(subjectName: string): boolean {
  return PRZEDMIOTY_LACZNE_CYKL.some((n) => (subjectName || '').trim() === n);
}

function subjectKey(planId: string | undefined, subjectName: string): string {
  return `${planId ?? 'plan'}_${(subjectName || '').trim()}`;
}

/**
 * Uzupełnia tylko nierozdysponowane godziny: zostawia już przydzielone,
 * a pozostałe wpisuje optymalnie (najpierw zera, potem wyrównuje).
 */
function uzupełnijNierozdysponowane(
  current: HoursByGrade,
  totalRequired: number,
  grades: string[]
): HoursByGrade {
  if (grades.length === 0 || totalRequired <= 0) return { ...current };
  const result: HoursByGrade = {};
  let assigned = 0;
  for (const g of grades) {
    const v = (current[g] ?? 0);
    result[g] = v;
    assigned += v;
  }
  let remaining = totalRequired - assigned;
  if (remaining <= 0) return result;
  for (let i = 0; i < remaining; i++) {
    const g = grades.reduce((min, gr) =>
      (result[gr] ?? 0) < (result[min] ?? 0) ? gr : min
    , grades[0]);
    result[g] = (result[g] ?? 0) + 1;
  }
  return result;
}

/**
 * POST /api/przydzial/generuj - Przydziela godziny do wyboru do przedmiotów po kolei (po latach).
 * Body: { klasaId: string, typSzkolyId: string } lub query: ?klasaId=...&typSzkolyId=...
 * Zapisuje wynik do przydzial-godzin-wybor (pole przydzial).
 */
export async function POST(request: NextRequest) {
  try {
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

    if (!klasaId || !typSzkolyId) {
      return NextResponse.json(
        { error: 'klasaId i typSzkolyId są wymagane (body JSON lub query)' },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });
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
      const grades = plan.table_structure?.grades ?? plan.grades ?? [];
      for (const entry of plan.subjects) {
        if (isDirectorRow(entry)) continue;
        const row = entry as SubjectRow;
        const subject = row.subject ?? '';
        if (isPrzedmiotLaczny(subject)) {
          const totalHours = row.total_hours ?? 0;
          if (totalHours <= 0) continue;
          const key = subjectKey(plan.plan_id, subject);
          const current = currentDoradztwo[key] ?? {};
          doradztwoNowy[key] = uzupełnijNierozdysponowane(current, totalHours, grades);
          continue;
        }
        const hoursToChoose = row.hours_to_choose ?? 0;
        if (hoursToChoose <= 0) continue;
        const key = subjectKey(plan.plan_id, subject);
        const current = currentPrzydzial[key] ?? {};
        przydzialNowy[key] = uzupełnijNierozdysponowane(current, hoursToChoose, grades);
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
      // Sprawdź, czy klasa istnieje – walidacja Payload wymaga poprawnej relacji
      const klasaExists = await payload.findByID({
        collection: 'klasy',
        id: klasaIdForRelation,
      }).catch(() => null);
      if (!klasaExists) {
        return NextResponse.json(
          { error: `Klasa o ID ${klasaId} nie istnieje` },
          { status: 400 }
        );
      }
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
    console.error('Błąd przy generowaniu przydziału godzin do wyboru:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nieznany błąd' },
      { status: 500 }
    );
  }
}
