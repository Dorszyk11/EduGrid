'use client';

import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatusPill from '@/components/ui/StatusPill';
import Icon from '@/components/ui/Icon';
import { PUSTA } from '@/lib/status-realizacji';
import plansData from '@/data/ramowe-plany.json';

type HoursByGrade = Record<string, number>;
type RawByGrade = Record<string, string>;

type SubjectRow = {
  lp?: number;
  subject?: string;
  hours_by_grade?: HoursByGrade;
  additional_by_grade?: HoursByGrade;
  total_hours?: number;
  additional_total?: number;
  raw?: RawByGrade;
  hours_to_choose?: number;
};

type DirectorRow = {
  director_discretion_hours: { total_hours: number };
};

type TableStructure = {
  grades?: string[];
  unit?: string;
};

type Plan = {
  plan_id?: string;
  attachment_no: string;
  school_type: string;
  cycle: string;
  scope?: string;
  grades?: string[];
  table_structure?: TableStructure;
  source_pages?: number[];
  source_pages_hint?: number[];
  subjects: (SubjectRow | DirectorRow)[];
};

const data = plansData as { plans?: Plan[]; reference_plans?: Plan[] };
const plans = data.plans ?? data.reference_plans ?? [];

function isDirectorRow(r: SubjectRow | DirectorRow): r is DirectorRow {
  return 'director_discretion_hours' in r && !('subject' in r);
}

function getGrades(plan: Plan): string[] {
  return plan.table_structure?.grades ?? plan.grades ?? [];
}

function getUnit(plan: Plan): string | undefined {
  return plan.table_structure?.unit;
}

function cellDisplay(
  row: SubjectRow,
  grade: string,
  preferRaw: boolean
): React.ReactNode {
  const raw = row.raw?.[grade];
  const val = row.hours_by_grade?.[grade];
  if (preferRaw && raw !== undefined && raw !== '') return raw;
  if (val !== undefined && val !== null) return String(val);
  return PUSTA;
}

function totalDisplay(row: SubjectRow): React.ReactNode {
  const r = row.raw?.razem;
  const t = row.total_hours;
  if (r !== undefined && r !== '') {
    return <span title="Wartość z tabeli">{r}</span>;
  }
  if (t !== undefined && t !== null) return String(t);
  if (row.hours_to_choose != null) {
    return <span className="text-ink-faint">min. {row.hours_to_choose}</span>;
  }
  return PUSTA;
}

export default function PlanyMeinPage() {
  const router = useRouter();

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
      <PageHeader
        title="Plany MEiN"
        description="Ramowe plany nauczania – szkoły, przedmioty i godziny (tygodniowo w klasach oraz razem w cyklu)."
        actions={
          <Button variant="ghost" onClick={() => router.push('/przydzial')}>
            <Icon name="back" size={16} />
            Powrót do Przydziału
          </Button>
        }
      />

      {plans.length === 0 ? (
        <div
          className="rounded-card border border-line bg-surface p-10 text-center text-sm text-ink-faint shadow-card"
          role="status"
        >
          Brak ramowych planów nauczania do wyświetlenia.
        </div>
      ) : (
      <div className="space-y-10">
        {plans.map((plan, idx) => {
          const grades = getGrades(plan);
          const unit = getUnit(plan);
          const hasGrades = grades.length > 0;

          return (
            <section
              key={plan.plan_id ?? `${plan.school_type}-${plan.cycle}-${idx}`}
              className="bg-surface rounded-card shadow-card border border-line overflow-hidden"
            >
              <div className="px-5 py-4 bg-surface-2 border-b border-line">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-semibold text-ink">{plan.school_type}</span>
                  <span className="text-ink-faint">·</span>
                  <span className="text-ink-soft">{plan.cycle}</span>
                  {plan.scope && (
                    <>
                      <span className="text-ink-faint">·</span>
                      <span className="text-ink-soft">{plan.scope}</span>
                    </>
                  )}
                  <span className="text-ink-faint text-sm">
                    Załącznik nr {plan.attachment_no}
                    {(plan.source_pages ?? plan.source_pages_hint)?.length
                      ? ` · str. ${(plan.source_pages ?? plan.source_pages_hint)!.join(', ')}`
                      : ''}
                  </span>
                </div>
                {unit && (
                  <p className="text-sm text-ink-faint mt-1">
                    Jednostka: {unit}
                  </p>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-line bg-surface-2">
                      <th className="px-3 py-2.5 text-sm font-medium text-ink-soft w-12">Lp.</th>
                      <th className="px-3 py-2.5 text-sm font-medium text-ink-soft sticky left-0 z-10 bg-surface-2">
                        Przedmiot
                      </th>
                      {hasGrades &&
                        grades.map((g) => (
                          <th
                            key={g}
                            className="px-3 py-2.5 text-sm font-medium text-ink-soft text-center w-16"
                          >
                            {g}
                          </th>
                        ))}
                      <th className="px-3 py-2.5 text-sm font-medium text-ink-soft text-right w-24">
                        Razem
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.subjects.map((entry, i) => {
                      if (isDirectorRow(entry)) {
                        const tot = entry.director_discretion_hours.total_hours;
                        return (
                          <tr
                            key={i}
                            className="border-b border-line bg-surface-2 font-medium"
                          >
                            <td className="px-3 py-2.5" colSpan={hasGrades ? 2 + grades.length : 2}>
                              <span className="inline-flex items-center gap-2 text-ink">
                                <StatusPill status="DYSPOZYCJA" label="dyspozycja dyrektora" />
                                Godziny do dyspozycji dyrektora
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{tot}</td>
                          </tr>
                        );
                      }

                      const row = entry as SubjectRow;
                      const subject = row.subject ?? PUSTA;

                      return (
                        <tr
                          key={i}
                          className="border-b border-line last:border-0 hover:bg-surface-2"
                        >
                          <td className="px-3 py-2.5 text-ink-faint tabular-nums">
                            {row.lp != null ? row.lp : PUSTA}
                          </td>
                          <td className="px-3 py-2.5 text-ink sticky left-0 z-10 bg-surface">{subject}</td>
                          {hasGrades &&
                            grades.map((g) => (
                              <td
                                key={g}
                                className="px-3 py-2.5 text-center tabular-nums text-ink-soft"
                              >
                                {cellDisplay(row, g, false)}
                              </td>
                            ))}
                          <td className="px-3 py-2.5 text-right tabular-nums text-ink">
                            {totalDisplay(row)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
      )}
    </div>
  );
}
