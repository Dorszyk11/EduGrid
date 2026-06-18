import type { SubjectRow } from '@/lib/przydzial/typy';

/**
 * Tabela „Zajęcia z zakresu doradztwa zawodowego" — czysto prezentacyjna.
 * Wydzielona 1:1 z PlanMeinTabela (SP3 Krok 2). Godziny doradztwa liczone są
 * łącznie dla cyklu (nie per rocznik), stąd kolumna „Zrealizowano" z progami.
 * Cała logika stanu/zapisu zostaje w rodzicu — tu tylko render + callbacki.
 */
export interface TabelaDoradztwaProps {
  przedmiotyLaczne: SubjectRow[];
  grades: string[];
  planId: string | undefined;
  idx: number;
  cycleLabel: string | undefined;
  klasaId: string | undefined;
  zrealizowaneDoradztwo: Record<string, Record<string, number>>;
  tylkoOdczyt: boolean;
  doradztwoKey: (planId: string | undefined, subject: string) => string;
  dodajZrealizowanaGodzine: (key: string, grade: string, maxHours: number) => void;
  usunZrealizowanaGodzine: (key: string, grade: string) => void;
}

export default function TabelaDoradztwa({
  przedmiotyLaczne,
  grades,
  planId,
  idx,
  cycleLabel,
  klasaId,
  zrealizowaneDoradztwo,
  tylkoOdczyt,
  doradztwoKey,
  dodajZrealizowanaGodzine,
  usunZrealizowanaGodzine,
}: TabelaDoradztwaProps) {
  return (
    <section
      className="bg-surface rounded-lg border border-line overflow-hidden shadow-sm w-full min-w-0 mt-6"
      aria-labelledby={`doradztwo-${planId ?? idx}`}
    >
      <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-line bg-surface-2">
        <h3 id={`doradztwo-${planId ?? idx}`} className="text-base font-semibold text-ink">
          Zajęcia z zakresu doradztwa zawodowego
        </h3>
        {cycleLabel && (
          <p className="text-xs text-ink-faint mt-0.5">{cycleLabel}</p>
        )}
      </div>
      <div className="overflow-x-auto -mx-2 sm:mx-0 p-2 sm:p-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table className="w-full min-w-[320px] text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-line bg-surface-2">
              <th className="px-4 py-2 text-left font-semibold text-ink-soft text-xs min-w-[180px]">
                Przedmiot
              </th>
              {grades.map((g) => (
                <th key={g} className="px-2 py-2 text-center font-semibold text-ink-soft text-xs w-24 border-l border-line">
                  {g}
                </th>
              ))}
              <th className="px-4 py-2 text-center font-semibold text-ink-soft text-xs w-28 border-l-2 border-line-strong">
                Zrealizowano
              </th>
            </tr>
          </thead>
          <tbody>
            {przedmiotyLaczne.map((row, i) => {
              const key = doradztwoKey(planId, row.subject ?? '');
              const totalHours = row.total_hours ?? 0;
              const byGrade = klasaId ? (zrealizowaneDoradztwo[key] ?? {}) : {};
              const suma = Object.values(byGrade).reduce((a, b) => a + b, 0);
              const canDodajOgolem = !!klasaId && suma < totalHours;
              return (
                <tr key={i} className="border-b border-line last:border-0 bg-surface hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-2 font-medium text-ink">{row.subject ?? '–'}</td>
                  {grades.map((g) => {
                    const val = byGrade[g] ?? 0;
                    const canDodaj = canDodajOgolem;
                    const canUsun = !!klasaId && val > 0;
                    return (
                      <td key={g} className="px-2 py-2 text-center border-l border-line align-top">
                        <div className="flex flex-col items-center gap-1">
                          <span className="tabular-nums font-medium text-ink">{val > 0 ? val : '–'}</span>
                          {!tylkoOdczyt && klasaId && (
                            <span className="inline-flex items-center gap-1 flex-wrap justify-center">
                              <button
                                type="button"
                                onClick={() => canDodaj && dodajZrealizowanaGodzine(key, g, totalHours)}
                                disabled={!canDodaj}
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${
                                  canDodaj ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100' : 'cursor-not-allowed bg-surface-2 text-ink-faint ring-line'
                                }`}
                              >
                                + Dodaj
                              </button>
                              <button
                                type="button"
                                onClick={() => canUsun && usunZrealizowanaGodzine(key, g)}
                                disabled={!canUsun}
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${
                                  canUsun ? 'bg-red-50 text-red-700 ring-red-200 hover:bg-red-100' : 'cursor-not-allowed bg-surface-2 text-ink-faint ring-line'
                                }`}
                              >
                                − Usuń
                              </button>
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td
                    className={`px-4 py-2 text-center border-l-2 border-line align-middle ${
                      klasaId && totalHours > 0
                        ? suma > totalHours
                          ? 'bg-blue-200 font-semibold text-blue-900 ring-1 ring-blue-400 rounded'
                          : suma === totalHours
                            ? 'bg-green-200 font-semibold text-green-900 ring-1 ring-green-500 rounded'
                            : totalHours - suma === 1
                              ? 'bg-amber-200 font-semibold text-amber-900 ring-1 ring-amber-500 rounded'
                              : 'bg-red-200 font-semibold text-red-900 ring-1 ring-red-500 rounded'
                        : ''
                    }`}
                  >
                    <span className="tabular-nums font-bold">{suma}</span>
                    <span className="opacity-90"> z </span>
                    <span className="tabular-nums font-semibold">{totalHours}</span>
                    <span className="block text-xs opacity-90 mt-0.5">godz. łącznie</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
