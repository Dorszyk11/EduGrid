import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import plansData from '@/utils/import/ramowe-plany.json';

type HoursByGrade = Record<string, number>;
type SubjectRow = {
  subject?: string;
  hours_by_grade?: HoursByGrade;
  total_hours?: number;
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

/** Przedmiot w zakresie rozszerzonym w planie MEiN (np. "Przedmioty w zakresie rozszerzonym") */
function isPrzedmiotRozszerzony(subjectName: string): boolean {
  return /w\s+zakresie\s+rozszerzonym|przedmioty\s+.*\s+rozszerz/i.test((subjectName || '').trim());
}

function subjectKey(planId: string | undefined, subjectName: string): string {
  return `${planId ?? 'plan'}_${(subjectName || '').trim()}`;
}

/**
 * Zwraca limity godzin rozszerzeń na rok (łączne dla wszystkich przedmiotów) z planu MEiN –
 * z pierwszego wiersza „przedmioty o zakresie rozszerzonym”.
 */
function getLimityRozszerzenNaRok(plans: PlanMein[]): HoursByGrade {
  const byGrade: HoursByGrade = {};
  for (const plan of plans) {
    for (const entry of plan.subjects) {
      if (isDirectorRow(entry)) continue;
      const row = entry as SubjectRow;
      const subject = row.subject ?? '';
      if (!isPrzedmiotRozszerzony(subject)) continue;
      const hoursByGrade = row.hours_by_grade ?? {};
      const grades = plan.table_structure?.grades ?? plan.grades ?? [];
      for (const g of grades) {
        byGrade[g] = (hoursByGrade[g] ?? 0) as number;
      }
      return byGrade;
    }
  }
  return byGrade;
}

/**
 * POST /api/przydzial/przydziel-godziny-rozszerzen
 * Godziny rozszerzeń są łączne dla wszystkich przedmiotów – jedna pula z limitami na rok.
 * Przydziela tę pulę między przedmioty oznaczone jako rozszerzone (round‑robin na rok).
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
      //
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
    const N = extendedKeysOrdered.length;

    const limityNaRok = getLimityRozszerzenNaRok(plans);
    const gradesOrder = plans[0] ? (plans[0].table_structure?.grades ?? plans[0].grades ?? []) : [];

    const przydzialUzupelniony: Record<string, HoursByGrade> = { ...currentPrzydzial };

    if (N > 0 && gradesOrder.length > 0) {
      for (const g of gradesOrder) {
        const limitG = (limityNaRok[g] ?? 0) as number;
        if (limitG <= 0) continue;
        for (let k = 0; k < limitG; k++) {
          const subKey = extendedKeysOrdered[k % N];
          if (!przydzialUzupelniony[subKey]) przydzialUzupelniony[subKey] = {};
          const prev = (przydzialUzupelniony[subKey][g] ?? 0) as number;
          przydzialUzupelniony[subKey][g] = prev + 1;
        }
      }
    }

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
      const klasaExists = await payload.findByID({ collection: 'klasy', id: klasaIdForRelation }).catch(() => null);
      if (!klasaExists) {
        return NextResponse.json({ error: `Klasa o ID ${klasaId} nie istnieje` }, { status: 400 });
      }
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
    console.error('Przydziel godziny rozszerzeń:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nieznany błąd' },
      { status: 500 }
    );
  }
}
