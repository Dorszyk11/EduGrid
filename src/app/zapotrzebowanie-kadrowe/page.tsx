'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ROK_SZKOLNY_WSZYSTKIE } from '@/lib/siatkaSzkoly';

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
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Nauczyciele wg przedmiotów
        </h1>
        <p className="text-gray-600 text-sm sm:text-base max-w-3xl">
          W tabeli przedmiotów każdy wiersz liczy nauczycieli <strong>tylko dla
          tego przedmiotu</strong>. Ten sam nauczyciel może prowadzić kilka
          przedmiotów (np. matematykę i fizykę) — wtedy w dwóch wierszach widać
          po jednej osobie, ale <strong>w całej szkole są tylko dwie osoby</strong>.
          Poniższe podsumowanie to pokazuje.
        </p>
      </header>

      <section className="flex flex-wrap gap-4 items-end bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="min-w-[200px] flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Typ szkoły
          </label>
          <select
            value={typSzkolyId}
            onChange={(e) => setTypSzkolyId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">— wybierz —</option>
            {typySzkol.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nazwa}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Rok / zakres
          </label>
          <select
            value={rokSzkolny}
            onChange={(e) => setRokSzkolny(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value={ROK_SZKOLNY_WSZYSTKIE}>
              Wszystkie oddziały (najnowszy rok w komórce)
            </option>
            {dostepneLata.map((r) => (
              <option key={r} value={r}>
                Rok szkolny {r}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={ukryjBezGodzin}
            onChange={(e) => setUkryjBezGodzin(e.target.checked)}
          />
          Ukryj przedmioty bez godzin w rozkładzie
        </label>
      </section>

      {blad && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
          {blad}
        </div>
      )}

      {ladowanie && (
        <div className="h-32 rounded-xl bg-gray-100 animate-pulse" aria-hidden />
      )}

      {!ladowanie && dane && typSzkolyId && (
        <>
          <p className="text-sm text-gray-500">
            {dane.nazwaTypuSzkoly ? `${dane.nazwaTypuSzkoly} · ` : ''}
            {dane.trybWszystkieLata
              ? 'Wszystkie oddziały typu'
              : `Rok szkolny ${dane.rokSzkolny}`}
            {' · '}
            {dane.klasy.length} oddziałów
          </p>

          {dane.podsumowanieCalejSzkoly && (
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-3">
                <p className="text-xs font-medium text-blue-900 uppercase tracking-wide">
                  Nauczycieli w rozkładzie
                </p>
                <p className="text-2xl font-bold text-blue-950 tabular-nums">
                  {dane.podsumowanieCalejSzkoly.roznychNauczycieliWRozkladzie}
                </p>
                <p className="text-xs text-blue-800 mt-1">
                  Różne osoby we wszystkich przedmiotach (np. 2 = polski + mat/fiz
                  u jednej osoby)
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Suma godzin / tydzień
                </p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">
                  {dane.podsumowanieCalejSzkoly.lacznaSumaGodzinTygodniowo} h
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Wszystkie zajęcia z macierzy (÷{hEtat} → min.{' '}
                  {dane.podsumowanieCalejSzkoly.minimalnaOsobZLacznychGodzin}{' '}
                  osób przy pełnym wykorzystaniu etatu)
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Suma „potrzeb” z wierszy
                </p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">
                  {dane.podsumowanieCalejSzkoly.naiwnaSumaPotrzebZPrzedmiotow}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Gdyby każdy przedmiot liczyć osobno (bez łączenia mat + fiz)
                </p>
              </div>
              <div
                className={`rounded-xl border px-4 py-3 ${
                  dane.podsumowanieCalejSzkoly.laczoneRolePrzedmiotow > 0
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Łączone role
                </p>
                <p className="text-2xl font-bold tabular-nums text-gray-900">
                  {dane.podsumowanieCalejSzkoly.laczoneRolePrzedmiotow}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Tyle „stanowisk z wierszy” pokrywa ta sama osoba na kilku
                  przedmiotach
                </p>
              </div>
            </section>
          )}

          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Ile nauczycieli — wg przedmiotu
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                <strong>W rozkładzie</strong> w wierszu = ile różnych osób uczy{' '}
                <em>tego</em> przedmiotu.                 Godziny w tabeli poniżej uwzględniają też plan MEiN i przydział (jak
                w Dyspozycji), gdy w rozkładzie jeszcze nikogo nie ma.{' '}
                <strong>Potrzeba</strong> = max( suma godzin
                ÷ {hEtat}, max wpisów w jednym oddziale). <strong>Brakuje</strong> w
                wierszu = tylko w obrębie tego przedmiotu — nie oznacza, że w szkole
                brakuje kolejnej osoby, jeśli ktoś inny już prowadzi inny przedmiot.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
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
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        Brak danych — sprawdź rozkład godzin lub odznacz filtr ukrywania.
                      </td>
                    </tr>
                  ) : (
                    zatrudnienieWidok.map((z) => (
                      <tr
                        key={z.przedmiotId}
                        className="border-b border-gray-100 hover:bg-gray-50/80"
                      >
                        <td className="px-4 py-2.5 font-medium text-gray-900">
                          <Link
                            href={`/przedmioty/${z.przedmiotId}`}
                            className="text-blue-700 hover:underline"
                          >
                            {z.przedmiotNazwa}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {z.sumaGodzinTygodniowo}
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums">
                          {z.oddzialyZZajeciami}
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums">
                          {z.roznychNauczycieliWRozkladzie}
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums">
                          {z.maxRownoleglychWpisowWJednymOddziale > 1 ? (
                            <span className="font-semibold text-amber-800">
                              {z.maxRownoleglychWpisowWJednymOddziale}
                            </span>
                          ) : (
                            z.maxRownoleglychWpisowWJednymOddziale
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums text-gray-600">
                          {z.etatyZSumyGodzin}
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums font-semibold">
                          {z.sugerowanaPotrzebaNauczycieli}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {z.brakujeNauczycieli > 0 ? (
                            <span className="inline-flex items-center justify-center min-w-[2rem] rounded-full bg-red-100 text-red-800 font-bold text-sm px-2 py-0.5">
                              {z.brakujeNauczycieli}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Wszystkie oddziały — godziny tygodniowo
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Liczba po slashu = tyle wpisów (nauczycieli) w rozkładzie w tej
                komórce. Pomarańczowa komórka = godziny z planu/przydziału, ale brak
                nauczyciela w rozkładzie. Pusty = brak zajęć.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="sticky left-0 z-10 bg-gray-100 border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700 min-w-[140px]">
                      Przedmiot
                    </th>
                    {dane.klasy.map((k) => (
                      <th
                        key={k.id}
                        className="border border-gray-200 px-2 py-2 text-center font-semibold text-gray-700 whitespace-nowrap"
                        title={k.profil || undefined}
                      >
                        <span className="block">{k.nazwa}</span>
                        {k.profil && (
                          <span className="block font-normal text-gray-500 text-[10px] leading-tight">
                            {k.profil}
                          </span>
                        )}
                      </th>
                    ))}
                    <th className="border border-gray-200 px-3 py-2 text-center font-semibold bg-gray-200 text-gray-800">
                      Σ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {macierzWidok.map((w, ri) => (
                    <tr
                      key={w.przedmiotId}
                      className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}
                    >
                      <td className="sticky left-0 z-10 border border-gray-200 px-3 py-2 font-medium bg-inherit">
                        <Link
                          href={`/przedmioty/${w.przedmiotId}`}
                          className="text-blue-700 hover:underline"
                        >
                          {w.przedmiotNazwa}
                        </Link>
                      </td>
                      {w.klasy.map((kom) => (
                        <td
                          key={kom.klasaId}
                          className={`border border-gray-200 px-2 py-2 text-center tabular-nums ${
                            kom.godzinyTygodniowo === 0
                              ? 'text-gray-300 bg-gray-50'
                              : kom.brakWRozkladzie
                                ? 'text-amber-950 bg-amber-50'
                                : 'text-gray-900'
                          }`}
                          title={
                            kom.brakWRozkladzie
                              ? `Plan/przydział: ${kom.godzinyZPlanuPrzydzialu ?? kom.godzinyTygodniowo} h/tyg., brak wpisu w rozkładzie`
                              : undefined
                          }
                        >
                          {kom.godzinyTygodniowo > 0 ? (
                            <>
                              <span className="font-semibold">
                                {kom.godzinyTygodniowo}h
                              </span>
                              {kom.brakWRozkladzie && (
                                <span className="block text-[10px] text-amber-800 font-medium">
                                  brak w rozkł.
                                </span>
                              )}
                              {!kom.brakWRozkladzie &&
                                kom.liczbaNauczycieli > 1 && (
                                  <span className="block text-[10px] text-amber-800 font-medium">
                                    / {kom.liczbaNauczycieli} naucz.
                                  </span>
                                )}
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                      ))}
                      <td className="border border-gray-200 px-2 py-2 text-center font-semibold bg-gray-100 tabular-nums">
                        {w.sumaGodzinTygodniowo}h
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-200 font-semibold text-gray-900">
                    <td className="sticky left-0 z-10 bg-gray-200 border border-gray-300 px-3 py-2">
                      Suma w oddziale
                    </td>
                    {dane.klasy.map((k) => {
                      const suma = macierzWidok.reduce(
                        (s, w) =>
                          s +
                          (w.klasy.find((x) => x.klasaId === k.id)
                            ?.godzinyTygodniowo || 0),
                        0
                      );
                      return (
                        <td
                          key={k.id}
                          className="border border-gray-300 px-2 py-2 text-center tabular-nums"
                        >
                          {suma}h
                        </td>
                      );
                    })}
                    <td className="border border-gray-300 px-2 py-2 text-center tabular-nums bg-gray-300">
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
        <p className="text-gray-500 text-sm">
          Brak oddziałów dla wybranego typu i roku. Spróbuj „Wszystkie oddziały”
          albo inny rok szkolny.
        </p>
      )}
    </div>
  );
}
