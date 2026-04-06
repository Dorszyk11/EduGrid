/**
 * Godziny tygodniowe z planu MEiN + zapisu przydziału (jak w Dyspozycji),
 * mapowane na parę klasaId + przedmiotId — używane gdy rozkład jest jeszcze pusty.
 */

import plansData from '@/utils/import/ramowe-plany.json';
import type { Payload } from '@/types/payload';

type HoursByGrade = Record<string, number>;

type SubjectRow = {
  subject?: string;
  hours_by_grade?: HoursByGrade;
  hours_to_choose?: number;
};

type DirectorRow = {
  director_discretion_hours: { total_hours: number };
};

type PlanItem = {
  plan_id?: string;
  school_type: string;
  cycle: string;
  table_structure?: { grades?: string[] };
  grades?: string[];
  subjects: (SubjectRow | DirectorRow)[];
};

const allPlans: PlanItem[] =
  (plansData as { plans?: PlanItem[]; reference_plans?: PlanItem[] }).plans ??
  (plansData as { reference_plans?: PlanItem[] }).reference_plans ??
  [];

function getGradesFromPlan(plan: PlanItem): string[] {
  return plan.table_structure?.grades ?? plan.grades ?? [];
}

export function subjectKey(planId: string | undefined, subjectName: string): string {
  return `${planId ?? 'plan'}_${(subjectName || '').trim()}`;
}

const PRZEDMIOTY_LACZNE_CYKL = ['Zajęcia z zakresu doradztwa zawodowego'];
function isPrzedmiotLaczny(subjectName: string): boolean {
  return PRZEDMIOTY_LACZNE_CYKL.some((n) => (subjectName || '').trim() === n);
}

function isPrzedmiotRozszerzony(subjectName: string): boolean {
  return /w\s+zakresie\s+rozszerzonym|przedmioty\s+.*\s+rozszerz/i.test(
    (subjectName || '').trim()
  );
}

function pominWyswietlanie(subjectName: string): boolean {
  const s = (subjectName || '').trim().toLowerCase();
  return (
    s.includes('doradztwa zawodowego') ||
    /w\s+zakresie\s+rozszerzonym|przedmioty\s+.*\s+rozszerz/.test(s)
  );
}

function matchSchoolType(nazwaTypu: string, schoolType: string): boolean {
  const a = (nazwaTypu || '').trim().toLowerCase();
  const b = (schoolType || '').trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.startsWith(b) && (a.length === b.length || a.charAt(b.length) === ','))
    return true;
  return false;
}

function cycleFilterZNazwy(nazwaTypu: string): string | undefined {
  const n = (nazwaTypu || '').toLowerCase();
  if (n.includes('i–iii') || n.includes('i-iii') || n.includes('1–3') || n.includes('1-3'))
    return 'Klasy I–III';
  if (
    n.includes('iv–viii') ||
    n.includes('iv-viii') ||
    n.includes('4–8') ||
    n.includes('4-8')
  )
    return 'Klasy IV–VIII';
  if (n.includes('i–v') || n.includes('i-v') || n.includes('1–5') || n.includes('1-5'))
    return 'Klasy I–V';
  if (n.includes('i–iv') || n.includes('i-iv') || n.includes('1–4') || n.includes('1-4'))
    return 'Klasy I–IV';
  if (
    n.includes('vii–viii') ||
    n.includes('vii-viii') ||
    n.includes('7–8') ||
    n.includes('7-8')
  )
    return 'Klasy VII–VIII';
  return undefined;
}

function isDirectorRow(r: SubjectRow | DirectorRow): r is DirectorRow {
  return 'director_discretion_hours' in r && !('subject' in r);
}

function isSubjectRow(row: SubjectRow | DirectorRow): row is SubjectRow & { subject: string } {
  return 'subject' in row && typeof (row as { subject?: string }).subject === 'string';
}

function sumGrupy(gr: { 1?: number; 2?: number } | undefined): number {
  if (!gr) return 0;
  return (gr[1] ?? 0) + (gr[2] ?? 0);
}

/** Rok w cyklu (I, II…) jak w Dyspozycji. */
function aktualnyRokWCykle(rokSzkolny: string, rokiPlanu: string[]): string {
  const m = rokSzkolny.match(/^(\d{4})[-/]\d{4}$/);
  const rokPoczatku = m ? parseInt(m[1], 10) : null;
  if (rokPoczatku == null || Number.isNaN(rokPoczatku) || rokiPlanu.length === 0) {
    return rokiPlanu[0] ?? '';
  }
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  let yearIndex: number;
  if (currentMonth >= 8) {
    yearIndex = currentYear - rokPoczatku;
  } else {
    yearIndex = currentYear - rokPoczatku - 1;
  }
  yearIndex = Math.max(0, Math.min(yearIndex, rokiPlanu.length - 1));
  return rokiPlanu[yearIndex] ?? rokiPlanu[0] ?? '';
}

function numerKlasyZKalsy(klasa: { nazwa?: string; numer_klasy?: number }): number {
  const nk = klasa.numer_klasy;
  if (typeof nk === 'number' && nk >= 1) return nk;
  const m = String(klasa.nazwa || '').match(/^(\d+)/);
  return m ? Number(m[1]) : 1;
}

function wybierzPlanDlaKlasy(klasa: { nazwa?: string }, nazwaTypuSzkoly: string): PlanItem | null {
  const numer = numerKlasyZKalsy(klasa);
  const nt = (nazwaTypuSzkoly || '').trim();

  let cycle: string | undefined;
  if (matchSchoolType(nt, 'Szkoła podstawowa')) {
    if (numer >= 1 && numer <= 3) cycle = 'Klasy I–III';
    else if (numer >= 4 && numer <= 8) cycle = 'Klasy IV–VIII';
  } else {
    cycle = cycleFilterZNazwy(nt);
  }

  return (
    allPlans.find(
      (p) => matchSchoolType(nt, p.school_type) && (!cycle || p.cycle === cycle)
    ) ?? null
  );
}

export type KsztaltPrzydzialuZApi = {
  przydzial: Record<string, Record<string, number>>;
  dyrektor: Record<string, Record<string, number>>;
  doradztwo: Record<string, Record<string, number>>;
  rozszerzenia: string[];
  rozszerzeniaPrzydzial: Record<string, Record<string, number>>;
  podzialNaGrupy: Record<string, Record<string, boolean>>;
  przydzialGrupy: Record<string, Record<string, { 1?: number; 2?: number }>>;
  dyrektorGrupy: Record<string, Record<string, { 1?: number; 2?: number }>>;
  rozszerzeniaGrupy: Record<string, Record<string, { 1?: number; 2?: number }>>;
};

function godzinyWierszaJakDyspozycja(
  plan: PlanItem,
  row: SubjectRow & { subject: string },
  selectedRok: string,
  d: KsztaltPrzydzialuZApi
): number {
  const nazwa = row.subject ?? '—';
  const subKey = subjectKey(plan.plan_id, nazwa);
  const base = row.hours_by_grade?.[selectedRok] ?? 0;
  const jestPodzial = d.podzialNaGrupy?.[subKey]?.[selectedRok];
  const p = jestPodzial
    ? sumGrupy(d.przydzialGrupy?.[subKey]?.[selectedRok])
    : (d.przydzial?.[subKey]?.[selectedRok] ?? 0);
  const dir = jestPodzial
    ? sumGrupy(d.dyrektorGrupy?.[subKey]?.[selectedRok])
    : (d.dyrektor?.[subKey]?.[selectedRok] ?? 0);

  if (isPrzedmiotLaczny(nazwa)) {
    return d.doradztwo?.[subKey]?.[selectedRok] ?? 0;
  }
  if (isPrzedmiotRozszerzony(nazwa)) {
    const planPrefix = (plan.plan_id ?? 'plan') + '_';
    return (d.rozszerzenia ?? [])
      .filter((k) => k.startsWith(planPrefix))
      .reduce((s, k) => {
        const jp = d.podzialNaGrupy?.[k]?.[selectedRok];
        const v = jp
          ? sumGrupy(d.rozszerzeniaGrupy?.[k]?.[selectedRok])
          : (d.rozszerzeniaPrzydzial?.[k]?.[selectedRok] ?? 0);
        return s + v;
      }, 0);
  }
  const rozsz = d.rozszerzenia?.includes(subKey)
    ? d.podzialNaGrupy?.[subKey]?.[selectedRok]
      ? sumGrupy(d.rozszerzeniaGrupy?.[subKey]?.[selectedRok])
      : (d.rozszerzeniaPrzydzial?.[subKey]?.[selectedRok] ?? 0)
    : 0;
  const baseEffective = jestPodzial ? base * 2 : base;
  return baseEffective + p + dir + rozsz;
}

function przedmiotIdDlaNazwy(
  nazwa: string,
  przedmioty: { id: string | number; nazwa?: string | null }[]
): string | null {
  const n = (nazwa || '').trim();
  const exact = przedmioty.find((p) => (p.nazwa || '').trim() === n);
  if (exact) return String(exact.id);
  const lower = n.toLowerCase();
  const fuzzy = przedmioty.find(
    (p) => (p.nazwa || '').trim().toLowerCase() === lower
  );
  return fuzzy ? String(fuzzy.id) : null;
}

function przydzialZDokumentu(doc: unknown): KsztaltPrzydzialuZApi {
  const d = doc as Record<string, unknown> | null | undefined;
  return {
    przydzial:
      d?.przydzial && typeof d.przydzial === 'object'
        ? (d.przydzial as Record<string, Record<string, number>>)
        : {},
    dyrektor:
      d?.dyrektor && typeof d.dyrektor === 'object'
        ? (d.dyrektor as Record<string, Record<string, number>>)
        : {},
    doradztwo:
      d?.doradztwo && typeof d.doradztwo === 'object'
        ? (d.doradztwo as Record<string, Record<string, number>>)
        : {},
    rozszerzenia: Array.isArray(d?.rozszerzenia) ? (d.rozszerzenia as string[]) : [],
    rozszerzeniaPrzydzial:
      d?.rozszerzeniaPrzydzial && typeof d.rozszerzeniaPrzydzial === 'object'
        ? (d.rozszerzeniaPrzydzial as Record<string, Record<string, number>>)
        : {},
    podzialNaGrupy:
      d?.podzial_na_grupy && typeof d.podzial_na_grupy === 'object'
        ? (d.podzial_na_grupy as Record<string, Record<string, boolean>>)
        : {},
    przydzialGrupy:
      d?.przydzial_grupy && typeof d.przydzial_grupy === 'object'
        ? (d.przydzial_grupy as Record<string, Record<string, { 1?: number; 2?: number }>>)
        : {},
    dyrektorGrupy:
      d?.dyrektor_grupy && typeof d.dyrektor_grupy === 'object'
        ? (d.dyrektor_grupy as Record<string, Record<string, { 1?: number; 2?: number }>>)
        : {},
    rozszerzeniaGrupy:
      d?.rozszerzenia_grupy && typeof d.rozszerzenia_grupy === 'object'
        ? (d.rozszerzenia_grupy as Record<string, Record<string, { 1?: number; 2?: number }>>)
        : {},
  };
}

/**
 * Mapa `${klasaId}__${przedmiotId}` → godziny tygodniowo (wg planu + przydziału).
 */
export async function pobierzMapeGodzinZPlanuIPrzydzialu(
  payload: Payload,
  klasy: { id: string | number; nazwa?: string; numer_klasy?: number; rok_szkolny?: string }[],
  nazwaTypuSzkoly: string
): Promise<Map<string, number>> {
  const wynik = new Map<string, number>();
  if (!klasy.length || !nazwaTypuSzkoly.trim()) return wynik;

  const przedmiotyRes = await payload.find({
    collection: 'przedmioty',
    limit: 1000,
    depth: 0,
  });
  const przedmiotyList = przedmiotyRes.docs;

  const klasaIds = klasy.map((k) => k.id);
  const przydzialyRes = await payload.find({
    collection: 'przydzial-godzin-wybor',
    where: {
      klasa: {
        in: klasaIds,
      },
    },
    limit: 1000,
    depth: 0,
  });

  const przydzialByKlasaId = new Map<string, unknown>();
  for (const doc of przydzialyRes.docs as any[]) {
    const kid =
      typeof doc.klasa === 'object' && doc.klasa?.id != null
        ? String(doc.klasa.id)
        : String(doc.klasa ?? '');
    if (kid) przydzialByKlasaId.set(kid, doc);
  }

  for (const klasa of klasy) {
    const plan = wybierzPlanDlaKlasy(klasa, nazwaTypuSzkoly);
    if (!plan) continue;

    const roki = getGradesFromPlan(plan);
    const rs = String(klasa.rok_szkolny || '');
    const selectedRok = roki.length ? aktualnyRokWCykle(rs, roki) : '';
    if (!selectedRok) continue;

    const doc = przydzialByKlasaId.get(String(klasa.id));
    const d = przydzialZDokumentu(doc);

    for (const entry of plan.subjects) {
      if (isDirectorRow(entry)) continue;
      if (!isSubjectRow(entry)) continue;
      if (pominWyswietlanie(entry.subject ?? '')) continue;

      const godz = godzinyWierszaJakDyspozycja(plan, entry, selectedRok, d);
      if (godz <= 0) continue;

      const pid = przedmiotIdDlaNazwy(entry.subject ?? '', przedmiotyList);
      if (!pid) continue;

      wynik.set(`${klasa.id}__${pid}`, godz);
    }
  }

  return wynik;
}
