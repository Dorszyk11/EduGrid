'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ROK_SZKOLNY_WSZYSTKIE } from '@/lib/siatkaSzkoly';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';

interface TypSzkoly {
  id: string;
  nazwa: string;
}

interface KlasaKolumna {
  id: string;
  nazwa: string;
  profil: string | null;
}

interface MacierzKlasa {
  klasaId: string;
  klasaNazwa: string;
  godzinyTygodniowo: number;
  godzinyRoczne: number;
  liczbaNauczycieli: number;
  /** Godziny z rozkładu (bez uzupełnienia z planu/przydziału). */
  godzinyWRozkladzie?: number;
  godzinyZPlanuPrzydzialu?: number;
  /** Zajęcia wg planu MEiN + przydziału, ale brak wpisu w rozkładzie godzin. */
  brakWRozkladzie?: boolean;
}

interface MacierzWiersz {
  przedmiotId: string;
  przedmiotNazwa: string;
  klasy: MacierzKlasa[];
  sumaGodzinTygodniowo: number;
  sumaGodzinRocznie: number;
}

interface WierszZatrudnienia {
  przedmiotId: string;
  przedmiotNazwa: string;
  sumaGodzinTygodniowo: number;
  sumaGodzinRocznie: number;
  oddzialyZZajeciami: number;
  roznychNauczycieliWRozkladzie: number;
  maxRownoleglychWpisowWJednymOddziale: number;
  etatyZSumyGodzin: number;
  sugerowanaPotrzebaNauczycieli: number;
  brakujeNauczycieli: number;
}

interface PodsumowanieCalejSzkoly {
  roznychNauczycieliWRozkladzie: number;
  lacznaSumaGodzinTygodniowo: number;
  naiwnaSumaPotrzebZPrzedmiotow: number;
  laczoneRolePrzedmiotow: number;
  minimalnaOsobZLacznychGodzin: number;
}

interface DaneApi {
  rokSzkolny: string;
  trybWszystkieLata?: boolean;
  nazwaTypuSzkoly?: string;
  godzinNaTypowyEtat?: number;
  klasy: KlasaKolumna[];
  macierz: MacierzWiersz[];
  zatrudnienieWgPrzedmiotu: WierszZatrudnienia[];
  podsumowanieCalejSzkoly?: PodsumowanieCalejSzkoly;
}

const SELECT_CLASS = 'w-full border border-line-strong rounded px-3 py-2 text-sm bg-surface text-ink';

export default function ZapotrzebowanieKadrowePage() {
  const [typySzkol, setTypySzkol] = useState<TypSzkoly[]>([]);
  const [typSzkolyId, setTypSzkolyId] = useState('');
  const [rokSzkolny, setRokSzkolny] = useState(ROK_SZKOLNY_WSZYSTKIE);
  const [dostepneLata, setDostepneLata] = useState<string[]>([]);
  const [dane, setDane] = useState<DaneApi | null>(null);
  const [ladowanie, setLadowanie] = useState(false);
  const [blad, setBlad] = useState<string | null>(null);
  const [ukryjBezGodzin, setUkryjBezGodzin] = useState(false);

  const hEtat = dane?.godzinNaTypowyEtat ?? 18;

  useEffect(() => {
    fetch('/api/typy-szkol', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.typySzkol ?? []);
        setTypySzkol(
          list.map((t: { id: string; nazwa?: string }) => ({
            id: String(t.id),
            nazwa: t.nazwa ?? '—',
          }))
        );
      })
      .catch(() => setTypySzkol([]));
  }, []);

  useEffect(() => {
    if (!typSzkolyId) {
      setDostepneLata([]);
      return;
    }
    let c = false;
    fetch(
      `/api/siatka-szkoly/dostepne-lata?typSzkolyId=${encodeURIComponent(typSzkolyId)}`,
      { cache: 'no-store' }
    )
      .then((r) => r.json())
      .then((j) => {
        if (!c && Array.isArray(j.lata)) setDostepneLata(j.lata);
      })
      .catch(() => {
        if (!c) setDostepneLata([]);
      });
    return () => {
      c = true;
    };
  }, [typSzkolyId]);

  useEffect(() => {
    if (!typSzkolyId) {
      setDane(null);
      return;
    }
    let c = false;
    setLadowanie(true);
    setBlad(null);
    const qs = `typSzkolyId=${encodeURIComponent(typSzkolyId)}&rokSzkolny=${encodeURIComponent(rokSzkolny)}`;
    fetch(`/api/siatka-szkoly?${qs}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          throw new Error(e.error || 'Błąd pobierania danych');
        }
        return r.json();
      })
      .then((data: DaneApi) => {
        if (!c) setDane(data);
      })
      .catch((e) => {
        if (!c) {
          setBlad(e instanceof Error ? e.message : 'Błąd');
          setDane(null);
        }
      })
      .finally(() => {
        if (!c) setLadowanie(false);
      });
    return () => {
      c = true;
    };
  }, [typSzkolyId, rokSzkolny]);

  const macierzWidok = useMemo(() => {
    if (!dane?.macierz) return [];
    if (!ukryjBezGodzin) return dane.macierz;
    return dane.macierz.filter((w) => w.sumaGodzinTygodniowo > 0);
  }, [dane, ukryjBezGodzin]);

  const zatrudnienieWidok = useMemo(() => {
    if (!dane?.zatrudnienieWgPrzedmiotu) return [];
    if (!ukryjBezGodzin) return dane.zatrudnienieWgPrzedmiotu;
    return dane.zatrudnienieWgPrzedmiotu.filter((z) => z.sumaGodzinTygodniowo > 0);
  }, [dane, ukryjBezGodzin]);

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Nauczyciele wg przedmiotów"
        description="Ilu nauczycieli potrzeba na każdy przedmiot — z uwzględnieniem łączonych ról."
      />
      <p className="text-sm text-ink-soft max-w-3xl leading-relaxed">
        W tabeli przedmiotów każdy wiersz liczy nauczycieli <strong className="text-ink">tylko dla
        tego przedmiotu</strong>. Ten sam nauczyciel może prowadzić kilka
        przedmiotów (np. matematykę i fizykę) — wtedy w dwóch wierszach widać
        po jednej osobie, ale <strong className="text-ink">w całej szkole są tylko dwie osoby</strong>.
        Poniższe podsumowanie to pokazuje.
      </p>

      <Card className="flex flex-wrap gap-4 items-end" padding="sm">
        <div className="min-w-[200px] flex-1">
          <label className="block text-xs font-medium text-ink-faint mb-1" htmlFor="z-typ">Typ szkoły</label>
          <select id="z-typ" value={typSzkolyId} onChange={(e) => setTypSzkolyId(e.target.value)} className={SELECT_CLASS}>
            <option value="">— wybierz —</option>
            {typySzkol.map((t) => (
              <option key={t.id} value={t.id}>{t.nazwa}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="block text-xs font-medium text-ink-faint mb-1" htmlFor="z-rok">Rok / zakres</label>
          <select id="z-rok" value={rokSzkolny} onChange={(e) => setRokSzkolny(e.target.value)} className={SELECT_CLASS}>
            <option value={ROK_SZKOLNY_WSZYSTKIE}>Wszystkie oddziały (najnowszy rok w komórce)</option>
            {dostepneLata.map((r) => (
              <option key={r} value={r}>Rok szkolny {r}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
          <input
            type="checkbox"
            checked={ukryjBezGodzin}
            onChange={(e) => setUkryjBezGodzin(e.target.checked)}
            className="accent-accent"
          />
          Ukryj przedmioty bez godzin w rozkładzie
        </label>
      </Card>

      {blad && (
        <div className="rounded border border-danger/30 bg-danger-bg text-danger px-4 py-3 text-sm">
          {blad}
        </div>
      )}

      {ladowanie && <div className="h-32 rounded-card bg-surface-2 animate-pulse" aria-hidden />}

      {!ladowanie && dane && typSzkolyId && (
        <>
          <p className="text-sm text-ink-faint">
            {dane.nazwaTypuSzkoly ? `${dane.nazwaTypuSzkoly} · ` : ''}
            {dane.trybWszystkieLata ? 'Wszystkie oddziały typu' : `Rok szkolny ${dane.rokSzkolny}`}
            {' · '}
            <span className="tabular">{dane.klasy.length}</span> oddziałów
          </p>

          {dane.podsumowanieCalejSzkoly && (
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-card border border-accent/30 bg-accent-weak px-4 py-3">
                <p className="text-xs font-medium text-accent-strong uppercase tracking-wide">Nauczycieli w rozkładzie</p>
                <p className="text-2xl font-bold text-ink tabular">{dane.podsumowanieCalejSzkoly.roznychNauczycieliWRozkladzie}</p>
                <p className="text-xs text-ink-soft mt-1">Różne osoby we wszystkich przedmiotach (np. 2 = polski + mat/fiz u jednej osoby)</p>
              </div>
              <div className="rounded-card border border-line bg-surface px-4 py-3">
                <p className="text-xs font-medium text-ink-faint uppercase tracking-wide">Suma godzin / tydzień</p>
                <p className="text-2xl font-bold text-ink tabular">{dane.podsumowanieCalejSzkoly.lacznaSumaGodzinTygodniowo} h</p>
                <p className="text-xs text-ink-faint mt-1">Wszystkie zajęcia z macierzy (÷{hEtat} → min. {dane.podsumowanieCalejSzkoly.minimalnaOsobZLacznychGodzin} osób przy pełnym wykorzystaniu etatu)</p>
              </div>
              <div className="rounded-card border border-line bg-surface px-4 py-3">
                <p className="text-xs font-medium text-ink-faint uppercase tracking-wide">Suma „potrzeb” z wierszy</p>
                <p className="text-2xl font-bold text-ink tabular">{dane.podsumowanieCalejSzkoly.naiwnaSumaPotrzebZPrzedmiotow}</p>
                <p className="text-xs text-ink-faint mt-1">Gdyby każdy przedmiot liczyć osobno (bez łączenia mat + fiz)</p>
              </div>
              <div className={`rounded-card border px-4 py-3 ${dane.podsumowanieCalejSzkoly.laczoneRolePrzedmiotow > 0 ? 'border-warn/40 bg-warn-bg' : 'border-line bg-surface'}`}>
                <p className="text-xs font-medium text-ink-soft uppercase tracking-wide">Łączone role</p>
                <p className="text-2xl font-bold tabular text-ink">{dane.podsumowanieCalejSzkoly.laczoneRolePrzedmiotow}</p>
                <p className="text-xs text-ink-soft mt-1">Tyle „stanowisk z wierszy” pokrywa ta sama osoba na kilku przedmiotach</p>
              </div>
            </section>
          )}

          <section className="rounded-card border border-line bg-surface shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-line bg-surface-2">
              <h2 className="font-display text-base font-semibold text-ink">Ile nauczycieli — wg przedmiotu</h2>
              <p className="text-xs text-ink-faint mt-1">
                <strong className="text-ink-soft">W rozkładzie</strong> w wierszu = ile różnych osób uczy{' '}
                <em>tego</em> przedmiotu. Godziny w tabeli poniżej uwzględniają też plan MEiN i przydział (jak
                w Dyspozycji), gdy w rozkładzie jeszcze nikogo nie ma.{' '}
                <strong className="text-ink-soft">Potrzeba</strong> = max( suma godzin
                ÷ {hEtat}, max wpisów w jednym oddziale). <strong className="text-ink-soft">Brakuje</strong> w
                wierszu = tylko w obrębie tego przedmiotu — nie oznacza, że w szkole
                brakuje kolejnej osoby, jeśli ktoś inny już prowadzi inny przedmiot.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-ink-faint border-b border-line">
                    <th className="px-4 py-3 font-medium">Przedmiot</th>
                    <th className="px-3 py-3 font-medium text-right">Σ h/tyg</th>
                    <th className="px-3 py-3 font-medium text-center">Oddziały</th>
                    <th className="px-3 py-3 font-medium text-center">W rozkładzie</th>
                    <th className="px-3 py-3 font-medium text-center">Max wpisów / oddział</th>
                    <th className="px-3 py-3 font-medium text-center">Z godzin ÷{hEtat}</th>
                    <th className="px-3 py-3 font-medium text-center">Potrzeba</th>
                    <th className="px-4 py-3 font-medium text-center">Brakuje</th>
                  </tr>
                </thead>
                <tbody>
                  {zatrudnienieWidok.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-ink-faint">
                        Brak danych — sprawdź rozkład godzin lub odznacz filtr ukrywania.
                      </td>
                    </tr>
                  ) : (
                    zatrudnienieWidok.map((z) => (
                      <tr key={z.przedmiotId} className="border-b border-line hover:bg-surface-2">
                        <td className="px-4 py-2.5 font-medium text-ink">
                          <Link href={`/przedmioty/${z.przedmiotId}`} className="text-accent hover:text-accent-strong">{z.przedmiotNazwa}</Link>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular">{z.sumaGodzinTygodniowo}</td>
                        <td className="px-3 py-2.5 text-center tabular">{z.oddzialyZZajeciami}</td>
                        <td className="px-3 py-2.5 text-center tabular">{z.roznychNauczycieliWRozkladzie}</td>
                        <td className="px-3 py-2.5 text-center tabular">
                          {z.maxRownoleglychWpisowWJednymOddziale > 1 ? (
                            <span className="font-semibold text-warn">{z.maxRownoleglychWpisowWJednymOddziale}</span>
                          ) : (
                            z.maxRownoleglychWpisowWJednymOddziale
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center tabular text-ink-soft">{z.etatyZSumyGodzin}</td>
                        <td className="px-3 py-2.5 text-center tabular font-semibold text-ink">{z.sugerowanaPotrzebaNauczycieli}</td>
                        <td className="px-4 py-2.5 text-center">
                          {z.brakujeNauczycieli > 0 ? (
                            <span className="inline-flex items-center justify-center min-w-[2rem] rounded-full bg-danger-bg text-danger font-bold text-sm px-2 py-0.5">{z.brakujeNauczycieli}</span>
                          ) : (
                            <span className="text-ink-faint">0</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-card border border-line bg-surface shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-line bg-surface-2">
              <h2 className="font-display text-base font-semibold text-ink">Wszystkie oddziały — godziny tygodniowo</h2>
              <p className="text-xs text-ink-faint mt-1">
                Liczba po slashu = tyle wpisów (nauczycieli) w rozkładzie w tej
                komórce. Pomarańczowa komórka = godziny z planu/przydziału, ale brak
                nauczyciela w rozkładzie. Pusty = brak zajęć.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-surface-2">
                    <th className="sticky left-0 z-10 bg-surface-2 border border-line px-3 py-2 text-left font-semibold text-ink-soft min-w-[140px]">Przedmiot</th>
                    {dane.klasy.map((k) => (
                      <th key={k.id} className="border border-line px-2 py-2 text-center font-semibold text-ink-soft whitespace-nowrap" title={k.profil || undefined}>
                        <span className="block">{k.nazwa}</span>
                        {k.profil && <span className="block font-normal text-ink-faint text-[10px] leading-tight">{k.profil}</span>}
                      </th>
                    ))}
                    <th className="border border-line px-3 py-2 text-center font-semibold bg-line text-ink">Σ</th>
                  </tr>
                </thead>
                <tbody>
                  {macierzWidok.map((w, ri) => (
                    <tr key={w.przedmiotId} className={ri % 2 === 0 ? 'bg-surface' : 'bg-surface-2'}>
                      <td className="sticky left-0 z-10 border border-line px-3 py-2 font-medium bg-inherit">
                        <Link href={`/przedmioty/${w.przedmiotId}`} className="text-accent hover:text-accent-strong">{w.przedmiotNazwa}</Link>
                      </td>
                      {w.klasy.map((kom) => (
                        <td
                          key={kom.klasaId}
                          className={`border border-line px-2 py-2 text-center tabular ${
                            kom.godzinyTygodniowo === 0
                              ? 'text-ink-faint bg-surface-2'
                              : kom.brakWRozkladzie
                                ? 'text-warn bg-warn-bg'
                                : 'text-ink'
                          }`}
                          title={kom.brakWRozkladzie ? `Plan/przydział: ${kom.godzinyZPlanuPrzydzialu ?? kom.godzinyTygodniowo} h/tyg., brak wpisu w rozkładzie` : undefined}
                        >
                          {kom.godzinyTygodniowo > 0 ? (
                            <>
                              <span className="font-semibold">{kom.godzinyTygodniowo}h</span>
                              {kom.brakWRozkladzie && <span className="block text-[10px] text-warn font-medium">brak w rozkł.</span>}
                              {!kom.brakWRozkladzie && kom.liczbaNauczycieli > 1 && (
                                <span className="block text-[10px] text-warn font-medium">/ {kom.liczbaNauczycieli} naucz.</span>
                              )}
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                      ))}
                      <td className="border border-line px-2 py-2 text-center font-semibold bg-surface-2 tabular">{w.sumaGodzinTygodniowo}h</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-line font-semibold text-ink">
                    <td className="sticky left-0 z-10 bg-line border border-line-strong px-3 py-2">Suma w oddziale</td>
                    {dane.klasy.map((k) => {
                      const suma = macierzWidok.reduce(
                        (s, w) => s + (w.klasy.find((x) => x.klasaId === k.id)?.godzinyTygodniowo || 0),
                        0
                      );
                      return (
                        <td key={k.id} className="border border-line-strong px-2 py-2 text-center tabular">{suma}h</td>
                      );
                    })}
                    <td className="border border-line-strong px-2 py-2 text-center tabular bg-line-strong">
                      {macierzWidok.reduce((s, w) => s + w.sumaGodzinTygodniowo, 0)}h
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </>
      )}

      {!ladowanie && typSzkolyId && dane && dane.klasy.length === 0 && (
        <p className="text-ink-faint text-sm">
          Brak oddziałów dla wybranego typu i roku. Spróbuj „Wszystkie oddziały”
          albo inny rok szkolny.
        </p>
      )}
    </div>
  );
}
