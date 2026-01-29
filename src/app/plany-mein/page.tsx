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
    return <span className="text-gray-500">min. {row.hours_to_choose}</span>;
  }
  return '–';
}

export default function PlanyMeinPage() {
  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Plany MEiN</h1>
      <p className="text-gray-600 mb-8">
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
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-semibold text-gray-900">{plan.school_type}</span>
                  <span className="text-gray-500">·</span>
                  <span className="text-gray-700">{plan.cycle}</span>
                  {plan.scope && (
                    <>
                      <span className="text-gray-500">·</span>
                      <span className="text-gray-600">{plan.scope}</span>
                    </>
                  )}
                  <span className="text-gray-400 text-sm">
                    Załącznik nr {plan.attachment_no}
                    {(plan.source_pages ?? plan.source_pages_hint)?.length
                      ? ` · str. ${(plan.source_pages ?? plan.source_pages_hint)!.join(', ')}`
                      : ''}
                  </span>
                </div>
                {unit && (
                  <p className="text-sm text-gray-500 mt-1">
                    Jednostka: {unit}
                  </p>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      <th className="px-3 py-2.5 text-sm font-medium text-gray-600 w-12">Lp.</th>
                      <th className="px-3 py-2.5 text-sm font-medium text-gray-600">Przedmiot</th>
                      {hasGrades &&
                        grades.map((g) => (
                          <th
                            key={g}
                            className="px-3 py-2.5 text-sm font-medium text-gray-600 text-center w-16"
                          >
                            {g}
                          </th>
                        ))}
                      <th className="px-3 py-2.5 text-sm font-medium text-gray-600 text-right w-24">
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
                            className="border-b border-gray-100 bg-amber-50/50 font-medium"
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
                          className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                        >
                          <td className="px-3 py-2.5 text-gray-500 tabular-nums">
                            {row.lp != null ? row.lp : '–'}
                          </td>
                          <td className="px-3 py-2.5 text-gray-800">{subject}</td>
                          {hasGrades &&
                            grades.map((g) => (
                              <td
                                key={g}
                                className="px-3 py-2.5 text-center tabular-nums text-gray-700"
                              >
                                {cellDisplay(row, g, false)}
                              </td>
                            ))}
                          <td className="px-3 py-2.5 text-right tabular-nums text-gray-800">
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
