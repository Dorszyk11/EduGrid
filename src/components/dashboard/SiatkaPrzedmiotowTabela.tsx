'use client';

import Link from 'next/link';

interface Klasa {
  id: string;
  nazwa: string;
  profil?: string | null;
  numerKlasy?: number;
}

interface MacierzKlasa {
  klasaId: string;
  klasaNazwa: string;
  godzinyTygodniowo: number;
  godzinyRoczne: number;
  nauczycielId?: string;
  nauczycielNazwa?: string;
  liczbaNauczycieli: number;
}

interface MacierzWiersz {
  przedmiotId: string;
  przedmiotNazwa: string;
  klasy: MacierzKlasa[];
  sumaGodzinTygodniowo: number;
  sumaGodzinRocznie: number;
}

export interface SiatkaPrzedmiotowTabelaProps {
  klasy: Klasa[];
  macierz: MacierzWiersz[];
  liczbaLat: number;
  rokSzkolny?: string;
  /** Godziny do dyspozycji dyrektora (opcjonalnie – domyślnie 0) */
  godzinyDyrektora?: number;
  /** Czy pokazywać tylko wiersze z przypisaniami (domyślnie false = wszystkie przedmioty) */
  tylkoZPrzypisaniami?: boolean;
  /** true = układ jak w Plany MEiN (jedna kolumna klasy, nagłówek jednowierszowy) */
  wariantMein?: boolean;
}

function numerRzymski(n: number): string {
  const map: [number, string][] = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let s = '';
  let k = n;
  for (const [val, sym] of map) {
    while (k >= val) {
      s += sym;
      k -= val;
    }
  }
  return s || String(n);
}

export default function SiatkaPrzedmiotowTabela({
  klasy,
  macierz,
  liczbaLat,
  rokSzkolny,
  godzinyDyrektora = 0,
  tylkoZPrzypisaniami = false,
  wariantMein = false,
}: SiatkaPrzedmiotowTabelaProps) {
  const wiersze = tylkoZPrzypisaniami
    ? macierz.filter((w) => w.sumaGodzinTygodniowo > 0)
    : macierz;

  // Sumy po kolumnach (dla wiersza "Razem na obowiązkowe...")
  const sumyPoKlasach = klasy.map((klasa) =>
    wiersze.reduce(
      (s, w) => s + (w.klasy.find((k) => k.klasaId === klasa.id)?.godzinyTygodniowo ?? 0),
      0
    )
  );
  const razemObowiazkowe = sumyPoKlasach.reduce((a, b) => a + b, 0);
  const ogolem = razemObowiazkowe + godzinyDyrektora;

  const okresTekst = liczbaLat > 0
    ? `Razem w ${liczbaLat}-letnim okresie nauczania`
    : 'Razem';

  const useMein = (wariantMein || klasy.length === 1) && klasy.length > 0;

  if (useMein) {
    // Układ jak w Plany MEiN: Lp. | Przedmiot | [klasa] | Razem
    const jednaKlasa = klasy[0]!;
    const labelKlasa = jednaKlasa
      ? (jednaKlasa.numerKlasy != null ? numerRzymski(jednaKlasa.numerKlasy) : (jednaKlasa.nazwa ?? '–'))
      : '–';
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {rokSzkolny && (
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
            Rok szkolny: {rokSzkolny}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                <th className="px-3 py-2.5 text-sm font-medium text-gray-600 w-12">Lp.</th>
                <th className="px-3 py-2.5 text-sm font-medium text-gray-600">Przedmiot</th>
                <th className="px-3 py-2.5 text-sm font-medium text-gray-600 text-center w-16">
                  {labelKlasa}
                </th>
                <th className="px-3 py-2.5 text-sm font-medium text-gray-600 text-right w-24">
                  Razem
                </th>
              </tr>
            </thead>
            <tbody>
              {wiersze.map((wiersz, i) => {
                const k = wiersz.klasy.find((c) => c.klasaId === jednaKlasa?.id);
                const godz = k?.godzinyTygodniowo ?? 0;
                return (
                  <tr
                    key={wiersz.przedmiotId}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-3 py-2.5 text-gray-500 tabular-nums">{i + 1}</td>
                    <td className="px-3 py-2.5 text-gray-800">
                      <Link
                        href={`/przedmioty/${wiersz.przedmiotId}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {wiersz.przedmiotNazwa}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-gray-700">
                      {godz > 0 ? godz : '–'}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-800">
                      {wiersz.sumaGodzinTygodniowo > 0 ? wiersz.sumaGodzinTygodniowo : '–'}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-b border-gray-100 bg-gray-50 font-medium">
                <td className="px-3 py-2.5" colSpan={2}>
                  Razem na obowiązkowe zajęcia edukacyjne i zajęcia z wychowawcą
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums">
                  {sumyPoKlasach[0] ?? '–'}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{razemObowiazkowe}</td>
              </tr>
              <tr className="border-b border-gray-100 bg-amber-50/50 font-medium">
                <td className="px-3 py-2.5" colSpan={3}>
                  Godziny do dyspozycji dyrektora szkoły
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{godzinyDyrektora}</td>
              </tr>
              <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                <td className="px-3 py-2.5" colSpan={3}>
                  Ogółem
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{ogolem}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {rokSzkolny && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
          Rok szkolny: {rokSzkolny}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300 text-sm">
          {/* Nagłówek wielopoziomowy */}
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th
                rowSpan={2}
                className="border border-gray-300 px-2 py-2 text-center align-middle font-semibold text-gray-700 w-12"
              >
                Lp.
              </th>
              <th
                rowSpan={2}
                className="border border-gray-300 px-3 py-2 text-left align-middle font-semibold text-gray-700 min-w-[200px]"
              >
                Obowiązkowe zajęcia edukacyjne i zajęcia z wychowawcą
              </th>
              <th
                colSpan={klasy.length}
                className="border border-gray-300 px-2 py-2 text-center font-semibold text-gray-700"
              >
                Tygodniowy wymiar godzin w klasie
              </th>
              <th
                rowSpan={2}
                className="border border-gray-300 px-3 py-2 text-center align-middle font-semibold text-gray-700 bg-gray-50 min-w-[100px]"
              >
                {okresTekst}
              </th>
            </tr>
            <tr className="bg-gray-100 border-b border-gray-300">
              {klasy.map((klasa) => (
                <th
                  key={klasa.id}
                  className="border border-gray-300 px-2 py-1.5 text-center font-medium text-gray-700"
                  title={klasa.profil || undefined}
                >
                  {klasa.numerKlasy != null ? numerRzymski(klasa.numerKlasy) : (klasa.nazwa ?? '–')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {wiersze.map((wiersz, index) => (
              <tr
                key={wiersz.przedmiotId}
                className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
              >
                <td className="border border-gray-300 px-2 py-2 text-center text-gray-700">
                  {index + 1}
                </td>
                <td className="border border-gray-300 px-3 py-2 font-medium sticky left-0 bg-inherit z-10">
                  <Link
                    href={`/przedmioty/${wiersz.przedmiotId}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {wiersz.przedmiotNazwa}
                  </Link>
                </td>
                {wiersz.klasy.map((k) => (
                  <td
                    key={k.klasaId}
                    className={`border border-gray-300 px-2 py-2 text-center ${
                      k.godzinyTygodniowo === 0 ? 'text-gray-400' : 'text-gray-900'
                    }`}
                  >
                    {k.godzinyTygodniowo > 0 ? k.godzinyTygodniowo : '–'}
                  </td>
                ))}
                <td className="border border-gray-300 px-3 py-2 text-center font-medium bg-gray-50">
                  {wiersz.sumaGodzinTygodniowo > 0 ? wiersz.sumaGodzinTygodniowo : '–'}
                </td>
              </tr>
            ))}

            {/* Wiersze specjalne */}
            <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
              <td className="border border-gray-300 px-2 py-2" colSpan={2}>
                Razem na obowiązkowe zajęcia edukacyjne i zajęcia z wychowawcą
              </td>
              {sumyPoKlasach.map((suma, i) => (
                <td key={klasy[i].id} className="border border-gray-300 px-2 py-2 text-center">
                  {suma}
                </td>
              ))}
              <td className="border border-gray-300 px-3 py-2 text-center bg-gray-200">
                {razemObowiazkowe}
              </td>
            </tr>
            <tr className="bg-amber-50 font-semibold">
              <td className="border border-gray-300 px-2 py-2" colSpan={2}>
                Godziny do dyspozycji dyrektora szkoły
              </td>
              {klasy.map((klasa) => (
                <td key={klasa.id} className="border border-gray-300 px-2 py-2 text-center">
                  –
                </td>
              ))}
              <td className="border border-gray-300 px-3 py-2 text-center bg-amber-100">
                {godzinyDyrektora}
              </td>
            </tr>
            <tr className="bg-gray-200 font-bold border-t-2 border-gray-500">
              <td className="border border-gray-300 px-2 py-2" colSpan={2}>
                Ogółem
              </td>
              {klasy.map((klasa) => (
                <td key={klasa.id} className="border border-gray-300 px-2 py-2 text-center">
                  –
                </td>
              ))}
              <td className="border border-gray-300 px-3 py-2 text-center bg-gray-300">
                {ogolem}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
