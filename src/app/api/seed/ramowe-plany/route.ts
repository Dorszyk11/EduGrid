import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import path from 'path';
import fs from 'fs';

interface PlanSubject {
  subject?: string;
  hours_by_grade?: Record<string, number>;
  total_hours?: number;
  director_discretion_hours?: unknown;
}

interface Plan {
  plan_id: string;
  school_type: string;
  cycle: string;
  table_structure?: { grades?: string[] };
  grades?: string[];
  subjects?: PlanSubject[];
}

interface RamowePlany {
  plans: Plan[];
}

/** Mapowanie nazwy przedmiotu na typ_zajec i poziom (domyślnie). */
function getPrzedmiotMeta(nazwa: string): { typ_zajec: string; poziom: string } {
  const lower = nazwa.toLowerCase();
  if (lower.includes('zawod') || lower.includes('kształcenie zawodowe') || lower.includes('efekty kształcenia')) {
    return { typ_zajec: 'zawodowe_teoretyczne', poziom: 'brak' };
  }
  if (lower.includes('rozszerzony') || lower.includes('zakres rozszerzony')) {
    return { typ_zajec: 'ogolnoksztalcace', poziom: 'rozszerzony' };
  }
  return { typ_zajec: 'ogolnoksztalcace', poziom: 'podstawowy' };
}

/** Generuje krótki kod MEiN dla przedmiotu. */
function subjectToKod(nazwa: string): string {
  const map: Record<string, string> = {
    'Język polski': 'JP',
    'Język obcy nowożytny': 'JON',
    'Drugi język obcy nowożytny albo język łaciński': 'J2',
    'Dodatkowe godziny języków obcych w szkołach dwujęzycznych': 'JON-D',
    'Edukacja wczesnoszkolna': 'EW',
    'Historia': 'HIS',
    'Wiedza o społeczeństwie': 'WOS',
    'Geografia': 'GEO',
    'Biologia': 'BIO',
    'Chemia': 'CHE',
    'Fizyka': 'FIZ',
    'Przyroda': 'PRZ',
    'Matematyka': 'MAT',
    'Informatyka': 'INF',
    'Muzyka': 'MUZ',
    'Plastyka': 'PLA',
    'Technika': 'TEC',
    'Wychowanie fizyczne': 'WF',
    'Edukacja dla bezpieczeństwa': 'EDB',
    'Zajęcia z wychowawcą': 'ZW',
    'Zajęcia z zakresu doradztwa zawodowego': 'DZ',
    'Edukacja obywatelska': 'EO',
    'Biznes i zarządzanie': 'BIZ',
    'Filozofia / plastyka / muzyka / język łaciński i kultura antyczna': 'FIL',
    'Przedmioty w zakresie rozszerzonym': 'ROZ',
    'Kształcenie zawodowe': 'KZ',
  };
  return map[nazwa] || nazwa.slice(0, 8).toUpperCase().replace(/\s/g, '');
}

/**
 * POST /api/seed/ramowe-plany
 * Importuje typy szkół i siatki godzin MEiN z pliku ramowe-plany.json.
 * Tylko NODE_ENV !== 'production'.
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Import ramowych planów dostępny tylko w środowisku deweloperskim' },
      { status: 403 }
    );
  }

  try {
    const payload = await getPayload({ config });
    const jsonPath = path.join(process.cwd(), 'ramowe-plany.json');
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const data: RamowePlany = JSON.parse(raw);

    const createOrGetTyp = async (nazwa: string, liczba_lat: number, kod_mein: string) => {
      const existing = await payload.find({
        collection: 'typy-szkol',
        where: { kod_mein: { equals: kod_mein } },
        limit: 1,
      });
      if (existing.docs.length > 0) return existing.docs[0];
      return payload.create({
        collection: 'typy-szkol',
        data: { nazwa, liczba_lat, kod_mein },
      });
    };

    const createOrGetPrzedmiot = async (nazwa: string) => {
      const kod = subjectToKod(nazwa);
      const meta = getPrzedmiotMeta(nazwa);
      const existing = await payload.find({
        collection: 'przedmioty',
        where: { nazwa: { equals: nazwa } },
        limit: 1,
      });
      if (existing.docs.length > 0) return existing.docs[0];
      return payload.create({
        collection: 'przedmioty',
        data: {
          nazwa,
          kod_mein: kod,
          typ_zajec: meta.typ_zajec,
          poziom: meta.poziom,
          aktywny: true,
        },
      });
    };

    const typyByPlanId = new Map<string, { id: string }>();
    const przedmiotyByNazwa = new Map<string, { id: string }>();
    let siatkiCount = 0;

    for (const plan of data.plans) {
      const grades = plan.table_structure?.grades ?? plan.grades ?? [];
      const liczbaLat = grades.length || 1;
      const nazwaTypu = `${plan.school_type}, ${plan.cycle}`;
      const typ = await createOrGetTyp(nazwaTypu, liczbaLat, plan.plan_id);
      typyByPlanId.set(plan.plan_id, { id: typ.id as string });

      for (const subj of plan.subjects ?? []) {
        if (subj.director_discretion_hours || !subj.subject) continue;

        const przedmiot = await createOrGetPrzedmiot(subj.subject);
        przedmiotyByNazwa.set(subj.subject, { id: przedmiot.id as string });

        const hoursByGrade = subj.hours_by_grade ?? {};
        const values = Object.values(hoursByGrade).filter((v) => typeof v === 'number');
        const totalHours = subj.total_hours ?? values.reduce((a, b) => a + b, 0);
        const minTyg = values.length > 0 ? Math.min(...values) : 0;
        const maxTyg = values.length > 0 ? Math.max(...values) : 0;

        if (totalHours <= 0) continue;

        const existingSiatka = await payload.find({
          collection: 'siatki-godzin-mein',
          where: {
            and: [
              { przedmiot: { equals: przedmiot.id } },
              { typ_szkoly: { equals: typ.id } },
            ],
          },
          limit: 1,
        });

        if (existingSiatka.docs.length === 0) {
          await payload.create({
            collection: 'siatki-godzin-mein',
            data: {
              przedmiot: przedmiot.id,
              typ_szkoly: typ.id,
              klasa: undefined,
              godziny_w_cyklu: Math.round(totalHours),
              godziny_tygodniowo_min: minTyg > 0 ? minTyg : undefined,
              godziny_tygodniowo_max: maxTyg > 0 ? maxTyg : undefined,
              obowiazkowe: true,
              data_obowiazywania_od: '2024-09-01',
            },
          });
          siatkiCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Import ramowych planów zakończony.',
      summary: {
        typySzkol: typyByPlanId.size,
        przedmioty: przedmiotyByNazwa.size,
        siatkiGodzinMein: siatkiCount,
      },
    });
  } catch (error) {
    console.error('Błąd importu ramowych planów:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}
