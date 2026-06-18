'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import DataTable, { type Column } from '@/components/ui/DataTable';
import StatusPill from '@/components/ui/StatusPill';
import KomorkaStatusu from '@/components/ui/KomorkaStatusu';
import Icon, { type IconName } from '@/components/ui/Icon';
import { PUSTA } from '@/lib/status-realizacji';

/* ── Kształt odpowiedzi 6 endpointów (zgodny z route'ami; bez zmian API) ───── */

interface PodsumowanieDane {
  zgodnoscMein: { lacznie: number; zgodne: number; zBrakami: number; zNadwyzkami: number; sredniProcent: number };
  obciazenia: { lacznie: number; przekroczone: number; pelne: number; niskie: number; srednieObciazenie: number };
  brakiKadrowe: { lacznie: number; laczneGodziny: number; wymaganeEtaty: number };
}

interface RyzykoDane {
  wskaznik: {
    wartosc: number;
    kategoria: 'niski' | 'średni' | 'wysoki' | 'krytyczny';
    czynniki: Array<{ nazwa: string; wplyw: number; opis: string }>;
    rekomendacje: string[];
  };
}

interface ObciazenieRow {
  nauczycielId: string;
  nauczycielNazwa: string;
  maxObciazenie: number;
  aktualneObciazenie: number;
  dostepneObciazenie: number;
  procentWykorzystania: number;
  status: 'PRZEKROCZONE' | 'PEŁNE' | 'NISKIE' | 'OK';
  liczbaPrzypisan: number;
}
interface ObciazenieDane {
  obciazenia: ObciazenieRow[];
  statystyki: { lacznie: number; laczneGodziny: number };
}

interface BrakWgPrzedmiotu {
  przedmiotId: string;
  przedmiotNazwa: string;
  liczbaKlas: number;
  laczneGodziny: number;
}
interface BrakiDane {
  statystyki: { lacznie: number; laczneGodziny: number; wymaganeEtaty: number; wedlugPrzedmiotu: BrakWgPrzedmiotu[] };
}

interface ZgodnoscDane {
  statystyki: { lacznie: number; zgodne: number; zBrakami: number; zNadwyzkami: number; bezDanych: number; sredniProcent: number };
  kompletne: boolean;
  komunikat?: string;
}

interface AlertItem {
  typ: 'error' | 'warning' | 'info';
  kategoria: string;
  tytul: string;
  opis: string;
  link?: string;
  priorytet: number;
}
interface AlertyDane {
  alerty: AlertItem[];
  statystyki: { lacznie: number; bledy: number; ostrzezenia: number; informacje: number };
}

/* ── Helper: stan asynchroniczny per sekcja (błąd ≠ pustka) ─────────────────── */

interface Stan<T> {
  dane: T | null;
  ladowanie: boolean;
  blad: string | null;
}
const STAN_POCZATKOWY = { dane: null, ladowanie: true, blad: null } as const;

async function pobierz<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', signal });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Błąd ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/* ── Prezentacja ────────────────────────────────────────────────────────────── */

const RYZYKO_STATUS: Record<RyzykoDane['wskaznik']['kategoria'], string> = {
  niski: 'OK',
  'średni': 'NADWYŻKA',
  wysoki: 'BRAK',
  krytyczny: 'BRAK',
};

const ALERT_STATUS: Record<AlertItem['typ'], string> = {
  error: 'BRAK',
  warning: 'NADWYŻKA',
  info: 'OK',
};
const ALERT_ETYKIETA: Record<AlertItem['typ'], string> = {
  error: 'Błąd',
  warning: 'Ostrzeżenie',
  info: 'Informacja',
};

function liczba(n: number | undefined, frac = 0): string {
  if (n === undefined || Number.isNaN(n)) return PUSTA;
  return n.toLocaleString('pl-PL', { minimumFractionDigits: frac, maximumFractionDigits: frac });
}

/** Pojedynczy kafelek KPI. Status nie kolorem — liczba + etykieta + opcjonalny ton tła. */
function KpiCard({
  label,
  value,
  hint,
  icon,
  ladowanie,
  blad,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: IconName;
  ladowanie: boolean;
  blad: string | null;
}) {
  return (
    <Card padding="sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-ink-soft">{label}</p>
        <Icon name={icon} size={18} className="shrink-0 text-ink-faint" />
      </div>
      {ladowanie ? (
        <div role="status" aria-live="polite" aria-busy="true" className="mt-2">
          <span className="block h-7 w-20 animate-pulse motion-reduce:animate-none rounded-sm bg-line" />
          <span className="sr-only">Wczytywanie wskaźnika…</span>
        </div>
      ) : blad ? (
        <p role="status" aria-live="polite" className="mt-2 text-sm text-danger">
          Nie udało się wczytać
        </p>
      ) : (
        <>
          <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-ink">{value}</p>
          {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
        </>
      )}
    </Card>
  );
}

interface AgregatSzkolyProps {
  typSzkolyId: string;
  rokSzkolny: string;
}

/**
 * Agregat całoszkolny: 6 niezależnych endpointów, każdy z własnym stanem
 * (skeleton-first, aria-live, błąd ≠ pustka). Sekcje renderują się niezależnie —
 * awaria jednej nie wygasza pozostałych.
 */
export default function AgregatSzkoly({ typSzkolyId, rokSzkolny }: AgregatSzkolyProps) {
  const [podsumowanie, setPodsumowanie] = useState<Stan<PodsumowanieDane>>(STAN_POCZATKOWY);
  const [ryzyko, setRyzyko] = useState<Stan<RyzykoDane>>(STAN_POCZATKOWY);
  const [obciazenie, setObciazenie] = useState<Stan<ObciazenieDane>>(STAN_POCZATKOWY);
  const [braki, setBraki] = useState<Stan<BrakiDane>>(STAN_POCZATKOWY);
  const [zgodnosc, setZgodnosc] = useState<Stan<ZgodnoscDane>>(STAN_POCZATKOWY);
  const [alerty, setAlerty] = useState<Stan<AlertyDane>>(STAN_POCZATKOWY);

  useEffect(() => {
    if (!typSzkolyId) return;
    const controller = new AbortController();
    const sygnal = controller.signal;
    const q = `typSzkolyId=${encodeURIComponent(typSzkolyId)}&rokSzkolny=${encodeURIComponent(rokSzkolny)}`;

    // Każdy endpoint w osobnym torze — błąd jednego nie wpływa na pozostałe.
    function tor<T>(url: string, set: (s: Stan<T>) => void) {
      set(STAN_POCZATKOWY);
      pobierz<T>(url, sygnal)
        .then((dane) => set({ dane, ladowanie: false, blad: null }))
        .catch((err: unknown) => {
          if (sygnal.aborted) return;
          const msg = err instanceof Error ? err.message : 'Nieznany błąd';
          set({ dane: null, ladowanie: false, blad: msg });
        });
    }

    tor<PodsumowanieDane>(`/api/dashboard/podsumowanie?${q}`, setPodsumowanie);
    tor<RyzykoDane>(`/api/dashboard/wskaznik-ryzyka?${q}`, setRyzyko);
    tor<ObciazenieDane>(`/api/dashboard/obciazenie-nauczycieli?${q}`, setObciazenie);
    tor<BrakiDane>(`/api/dashboard/braki-kadrowe?${q}`, setBraki);
    tor<ZgodnoscDane>(`/api/dashboard/zgodnosc-mein?${q}`, setZgodnosc);
    tor<AlertyDane>(`/api/dashboard/alerty?${q}`, setAlerty);

    return () => controller.abort();
  }, [typSzkolyId, rokSzkolny]);

  /* — Kolumny tabel — */
  const kolObciazenie: Column<ObciazenieRow>[] = [
    { key: 'nauczyciel', header: 'Nauczyciel', render: (r) => r.nauczycielNazwa },
    {
      key: 'obciazenie',
      header: 'Obciążenie',
      align: 'right',
      render: (r) => <KomorkaStatusu zrealizowane={r.aktualneObciazenie} docelowe={r.maxObciazenie} />,
    },
    {
      key: 'dostepne',
      header: 'Wolne godz.',
      align: 'right',
      className: 'tabular-nums',
      render: (r) => liczba(r.dostepneObciazenie),
    },
    {
      key: 'przypisania',
      header: 'Przypisań',
      align: 'right',
      className: 'tabular-nums',
      render: (r) => liczba(r.liczbaPrzypisan),
    },
  ];

  const kolBraki: Column<BrakWgPrzedmiotu>[] = [
    { key: 'przedmiot', header: 'Przedmiot', render: (r) => r.przedmiotNazwa },
    { key: 'klasy', header: 'Klas', align: 'right', className: 'tabular-nums', render: (r) => liczba(r.liczbaKlas) },
    {
      key: 'godziny',
      header: 'Godz./tydz.',
      align: 'right',
      className: 'tabular-nums',
      render: (r) => liczba(r.laczneGodziny),
    },
  ];

  const ryzykoW = ryzyko.dane?.wskaznik;
  const zg = zgodnosc.dane?.statystyki;

  return (
    <div className="space-y-6">
      {/* — Rząd KPI — */}
      <section aria-label="Kluczowe wskaźniki" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Zgodność z MEiN"
          icon="realizacja"
          value={zg ? `${liczba(zg.sredniProcent)}%` : PUSTA}
          hint={zg ? `${zg.zgodne}/${zg.lacznie} pozycji OK` : undefined}
          ladowanie={zgodnosc.ladowanie}
          blad={zgodnosc.blad}
        />
        <KpiCard
          label="Wskaźnik ryzyka"
          icon="chart"
          value={ryzykoW ? `${ryzykoW.wartosc}` : PUSTA}
          hint={ryzykoW ? `Poziom: ${ryzykoW.kategoria}` : undefined}
          ladowanie={ryzyko.ladowanie}
          blad={ryzyko.blad}
        />
        <KpiCard
          label="Braki kadrowe"
          icon="kadry"
          value={liczba(braki.dane?.statystyki.lacznie)}
          hint={
            braki.dane
              ? `${liczba(braki.dane.statystyki.laczneGodziny)} h/tydz · ~${liczba(braki.dane.statystyki.wymaganeEtaty)} etatów`
              : undefined
          }
          ladowanie={braki.ladowanie}
          blad={braki.blad}
        />
        <KpiCard
          label="Przeciążeni nauczyciele"
          icon="nauczyciele"
          value={liczba(podsumowanie.dane?.obciazenia.przekroczone)}
          hint={podsumowanie.dane ? `z ${liczba(podsumowanie.dane.obciazenia.lacznie)} aktywnych` : undefined}
          ladowanie={podsumowanie.ladowanie}
          blad={podsumowanie.blad}
        />
      </section>

      {/* — Alerty — */}
      <section aria-label="Alerty" className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">Alerty</h2>
        {alerty.ladowanie ? (
          <div role="status" aria-live="polite" aria-busy="true" className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <span key={i} className="block h-14 animate-pulse motion-reduce:animate-none rounded-card bg-line" />
            ))}
            <span className="sr-only">Wczytywanie alertów…</span>
          </div>
        ) : alerty.blad ? (
          <Card padding="sm">
            <p role="alert" className="text-sm text-danger">
              Nie udało się wczytać alertów: {alerty.blad}
            </p>
          </Card>
        ) : !alerty.dane || alerty.dane.alerty.length === 0 ? (
          <Card padding="sm">
            <p role="status" aria-live="polite" className="text-sm text-ink-soft">
              Brak alertów — wszystko w porządku.
            </p>
          </Card>
        ) : (
          <ul className="space-y-2" aria-live="polite">
            {alerty.dane.alerty.map((a, i) => (
              <li key={`${a.kategoria}-${i}`}>
                <Card padding="sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusPill status={ALERT_STATUS[a.typ]} label={ALERT_ETYKIETA[a.typ]} />
                        <p className="font-medium text-ink">{a.tytul}</p>
                      </div>
                      <p className="mt-1 text-sm text-ink-soft">{a.opis}</p>
                    </div>
                    {a.link && (
                      <Link
                        href={a.link}
                        className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-accent hover:text-accent-strong"
                      >
                        Przejdź
                        <Icon name="chevron-right" size={14} />
                      </Link>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* — Obciążenie nauczycieli — */}
        <section aria-label="Obciążenie nauczycieli" className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">Obciążenie nauczycieli</h2>
          <DataTable<ObciazenieRow>
            columns={kolObciazenie}
            rows={obciazenie.dane?.obciazenia ?? []}
            getRowKey={(r) => r.nauczycielId}
            loading={obciazenie.ladowanie}
            error={obciazenie.blad}
            stickyHeader
            empty="Brak aktywnych nauczycieli."
            footer={
              obciazenie.dane && obciazenie.dane.obciazenia.length > 0 ? (
                <>
                  <td className="px-3 py-2.5 text-ink">Razem</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink">
                    {liczba(obciazenie.dane.statystyki.laczneGodziny)} h
                  </td>
                  <td className="px-3 py-2.5" />
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink">
                    {liczba(obciazenie.dane.statystyki.lacznie)}
                  </td>
                </>
              ) : null
            }
          />
        </section>

        {/* — Braki kadrowe — */}
        <section aria-label="Braki kadrowe" className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">Braki kadrowe wg przedmiotu</h2>
          <DataTable<BrakWgPrzedmiotu>
            columns={kolBraki}
            rows={braki.dane?.statystyki.wedlugPrzedmiotu ?? []}
            getRowKey={(r) => r.przedmiotId}
            loading={braki.ladowanie}
            error={braki.blad}
            stickyHeader
            empty="Brak braków kadrowych."
            footer={
              braki.dane && braki.dane.statystyki.wedlugPrzedmiotu.length > 0 ? (
                <>
                  <td className="px-3 py-2.5 text-ink">Razem</td>
                  <td className="px-3 py-2.5" />
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink">
                    {liczba(braki.dane.statystyki.laczneGodziny)} h
                  </td>
                </>
              ) : null
            }
          />
        </section>
      </div>

      {/* — Zgodność MEiN (statusy nie kolorem) — */}
      <section aria-label="Zgodność z MEiN" className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">Zgodność z planem MEiN</h2>
        {zgodnosc.ladowanie ? (
          <div role="status" aria-live="polite" aria-busy="true">
            <span className="block h-24 animate-pulse motion-reduce:animate-none rounded-card bg-line" />
            <span className="sr-only">Wczytywanie zgodności…</span>
          </div>
        ) : zgodnosc.blad ? (
          <Card padding="sm">
            <p role="alert" className="text-sm text-danger">
              Nie udało się wczytać zgodności: {zgodnosc.blad}
            </p>
          </Card>
        ) : !zg || zg.lacznie === 0 ? (
          <Card padding="sm">
            <p role="status" aria-live="polite" className="text-sm text-ink-soft">
              {zgodnosc.dane?.komunikat ?? 'Brak danych zgodności dla wybranego typu szkoły.'}
            </p>
          </Card>
        ) : (
          <Card padding="sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status="OK" label={`Zgodne: ${zg.zgodne}`} />
              <StatusPill status="BRAK" label={`Braki: ${zg.zBrakami}`} />
              <StatusPill status="NADWYŻKA" label={`Nadwyżki: ${zg.zNadwyzkami}`} />
              {zg.bezDanych > 0 && <StatusPill status="" label={`Bez danych: ${zg.bezDanych}`} />}
            </div>
            {!zgodnosc.dane?.kompletne && zgodnosc.dane?.komunikat && (
              <p role="status" aria-live="polite" className="mt-3 text-sm text-warn">
                {zgodnosc.dane.komunikat}
              </p>
            )}
            {ryzykoW && ryzykoW.rekomendacje.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-ink-soft">Rekomendacje</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-soft">
                  {ryzykoW.rekomendacje.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}
      </section>
    </div>
  );
}
