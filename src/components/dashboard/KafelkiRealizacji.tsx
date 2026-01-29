'use client';

import WykresKolowyRealizacji from './WykresKolowyRealizacji';

export interface DaneRealizacji {
  /** Procent realizacji (0–100) */
  procentRealizacji: number;
  /** Łączna liczba brakujących godzin */
  brakiGodzin: number;
  /** Łączna liczba nadwyżek godzin */
  nadwyzkiGodzin: number;
  /** Liczba przedmiotów/pozycji z brakami */
  liczbaBrakow?: number;
  /** Liczba przedmiotów/pozycji z nadwyżkami */
  liczbaNadwyzek?: number;
}

interface KafelkiRealizacjiProps {
  dane: DaneRealizacji | null;
  ladowanie?: boolean;
  brakDanychKomunikat?: string;
}

export default function KafelkiRealizacji({
  dane,
  ladowanie = false,
  brakDanychKomunikat = 'Wybierz typ szkoły i rocznik, aby zobaczyć statystyki realizacji.',
}: KafelkiRealizacjiProps) {
  if (ladowanie) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 animate-pulse h-[180px]" />
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 animate-pulse h-[180px]" />
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 animate-pulse h-[180px]" />
      </div>
    );
  }

  if (!dane) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
        {brakDanychKomunikat}
      </div>
    );
  }

  const { procentRealizacji, brakiGodzin, nadwyzkiGodzin } = dane;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Wykres kołowy – procent realizacji */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col items-center justify-center min-h-[200px]">
        <WykresKolowyRealizacji procent={procentRealizacji} label="Procent realizacji" size={140} />
      </div>

      {/* Kafelek: Braki godzin */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col justify-center min-h-[200px]">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Braki godzin</h3>
        <p className="text-3xl font-bold text-red-600">{brakiGodzin}</p>
        <p className="text-sm text-gray-500 mt-1">godz. łącznie do uzupełnienia</p>
      </div>

      {/* Kafelek: Nadwyżki */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col justify-center min-h-[200px]">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Nadwyżki</h3>
        <p className="text-3xl font-bold text-emerald-600">{nadwyzkiGodzin}</p>
        <p className="text-sm text-gray-500 mt-1">godz. łącznie ponad wymóg</p>
      </div>
    </div>
  );
}
