import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import plansData from '@/utils/import/ramowe-plany.json';

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
  return '–';
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
  return '–';
}

export default function PlanyMeinPage() {
  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <div className="mb-6">
        <Link
          href="/przydzial"
          className="inline-flex items-center gap-1.5 text-ink-soft hover:text-ink font-medium"
        >
          <Icon name="back" size={16} />
          Powrót do Przydziału
        </Link>
      </div>
      <h1 className="font-display text-2xl font-bold text-ink tracking-tight mb-1">Plany MEiN</h1>
      <p className="text-ink-soft mb-8">
        Ramowe plany nauczania – szkoły, przedmioty i godziny (tygodniowo w klasach oraz razem w cyklu).
      </p>

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
                      <th className="px-3 py-2.5 text-sm font-medium text-ink-soft">Przedmiot</th>
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
                            className="border-b border-line bg-warn-bg font-medium"
                          >
                            <td className="px-3 py-2.5" colSpan={hasGrades ? 2 + grades.length : 2}>
                              Godziny do dyspozycji dyrektora
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{tot}</td>
                          </tr>
                        );
                      }

                      const row = entry as SubjectRow;
                      const subject = row.subject ?? '–';

                      return (
                        <tr
                          key={i}
                          className="border-b border-line last:border-0 hover:bg-surface-2"
                        >
                          <td className="px-3 py-2.5 text-ink-faint tabular-nums">
                            {row.lp != null ? row.lp : '–'}
                          </td>
                          <td className="px-3 py-2.5 text-ink">{subject}</td>
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
    </div>
  );
}
