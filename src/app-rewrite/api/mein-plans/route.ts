import { NextRequest, NextResponse } from "next/server";
import plansData from "@/utils/import/ramowe-plany.json";
import type {
  MeinPlan,
  MeinSubjectRow,
} from "@/features/assignment/presentation/types";

type RawPlan = {
  plan_id?: string;
  attachment_no: string;
  school_type: string;
  cycle: string;
  cycle_short?: string;
  scope?: string;
  grades?: string[];
  table_structure?: { grades?: string[]; unit?: string };
  source_pages?: number[];
  source_pages_hint?: number[];
  subjects: Array<Record<string, unknown>>;
};

const data = plansData as { plans?: RawPlan[]; reference_plans?: RawPlan[] };
const allPlans: RawPlan[] = data.plans ?? data.reference_plans ?? [];

function matchSchoolType(query: string, planType: string): boolean {
  const a = (query || "").trim().toLowerCase();
  const b = (planType || "").trim().toLowerCase();
  if (!a) return false;
  if (a === b) return true;
  if (b === "szkoła podstawowa" && a.startsWith("szkoła podstawowa"))
    return true;
  return false;
}

function isDirectorRow(row: Record<string, unknown>): boolean {
  return "director_discretion_hours" in row && !("subject" in row);
}

function isPrzedmiotRozszerzony(name: string): boolean {
  return /w\s+zakresie\s+rozszerzonym|przedmioty\s+.*\s+rozszerz/i.test(
    name.trim(),
  );
}

const PRZEDMIOTY_LACZNE = ["Zajęcia z zakresu doradztwa zawodowego"];

function isPrzedmiotLaczny(name: string): boolean {
  return PRZEDMIOTY_LACZNE.includes(name.trim());
}

function convertPlan(raw: RawPlan): MeinPlan {
  const grades = raw.table_structure?.grades ?? raw.grades ?? [];
  let directorHours = 0;
  const subjects: MeinSubjectRow[] = [];

  for (const entry of raw.subjects) {
    if (isDirectorRow(entry)) {
      const dh = entry.director_discretion_hours as Record<string, unknown>;
      directorHours = (dh?.total_hours as number) ?? 0;
      continue;
    }

    const subjectName = (entry.subject as string) ?? "–";
    const hoursByGrade = (entry.hours_by_grade as Record<string, number>) ?? {};
    const totalHours = (entry.total_hours as number) ?? 0;
    const hoursToChoose = (entry.hours_to_choose as number) ?? 0;
    const rawValues = entry.raw as Record<string, string> | undefined;

    subjects.push({
      lp: entry.lp as number | undefined,
      subject: subjectName,
      hoursByGrade,
      totalHours,
      hoursToChoose,
      rawValues,
      isExtendedRow: isPrzedmiotRozszerzony(subjectName),
      isCycleTotalSubject: isPrzedmiotLaczny(subjectName),
    });
  }

  return {
    planId: raw.plan_id ?? `${raw.school_type}-${raw.cycle}`,
    attachmentNo: raw.attachment_no,
    schoolType: raw.school_type,
    cycle: raw.cycle,
    cycleShort: raw.cycle_short,
    scope: raw.scope,
    grades,
    unit: raw.table_structure?.unit,
    sourcePages: raw.source_pages ?? raw.source_pages_hint,
    subjects,
    directorHours,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const schoolType = searchParams.get("schoolType") ?? "";
  const cycleFilter = searchParams.get("cycle") ?? undefined;

  const matched = allPlans.filter(
    (p) =>
      matchSchoolType(schoolType, p.school_type) &&
      (!cycleFilter || p.cycle === cycleFilter),
  );

  return NextResponse.json(matched.map(convertPlan));
}
