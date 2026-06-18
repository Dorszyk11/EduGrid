import type { SubjectRow } from '@/lib/przydzial/typy';
import { buttonClass } from '@/components/ui/Button';
import KomorkaStatusu from '@/components/ui/KomorkaStatusu';

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
      className="bg-surface rounded-card border border-line overflow-hidden shadow-xs w-full min-w-0 mt-6"
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
                                className={`${buttonClass('ghost', 'sm')} ring-1 ${
                                  canDodaj
                                    ? 'bg-ok-bg text-ok ring-ok/30 hover:bg-ok-bg'
                                    : 'bg-surface-2 text-ink-faint ring-line'
                                }`}
                              >
                                + Dodaj
                              </button>
                              <button
                                type="button"
                                onClick={() => canUsun && usunZrealizowanaGodzine(key, g)}
                                disabled={!canUsun}
                                className={`${buttonClass('ghost', 'sm')} ring-1 ${
                                  canUsun
                                    ? 'bg-danger-bg text-danger ring-danger/30 hover:bg-danger-bg'
                                    : 'bg-surface-2 text-ink-faint ring-line'
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
                  <td className="px-4 py-2 text-center border-l-2 border-line-strong align-middle">
                    {klasaId && totalHours > 0 ? (
                      <span className="inline-flex flex-col items-center gap-0.5">
                        <KomorkaStatusu zrealizowane={suma} docelowe={totalHours} />
                        <span className="block text-xs text-ink-faint">godz. łącznie</span>
                      </span>
                    ) : (
                      <span className="text-ink">
                        <span className="tabular-nums font-bold">{suma}</span>
                        <span className="opacity-90"> z </span>
                        <span className="tabular-nums font-semibold">{totalHours}</span>
                        <span className="block text-xs text-ink-faint mt-0.5">godz. łącznie</span>
                      </span>
                    )}
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
