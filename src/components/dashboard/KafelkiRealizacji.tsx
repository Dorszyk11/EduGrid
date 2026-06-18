'use client';

import Card from '@/components/ui/Card';
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
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`kafelek-skeleton-${i}`}
            className="bg-surface-2 rounded-card border border-line p-3 sm:p-4 animate-pulse motion-reduce:animate-none min-h-[140px] sm:min-h-[180px]"
          />
        ))}
        <span className="sr-only">Wczytywanie statystyk realizacji…</span>
      </div>
    );
  }

  if (!dane) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-warn-bg border border-warn/40 rounded-card p-3 sm:p-4 text-warn text-sm leading-relaxed"
      >
        {brakDanychKomunikat}
      </div>
    );
  }

  const { procentRealizacji, brakiGodzin, nadwyzkiGodzin } = dane;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      {/* Wykres kołowy – procent realizacji */}
      <Card padding="sm" className="flex flex-col items-center justify-center min-h-[140px] sm:min-h-[200px]">
        <WykresKolowyRealizacji procent={procentRealizacji} label="Procent realizacji" size={120} />
      </Card>

      {/* Kafelek: Braki godzin */}
      <Card padding="sm" className="flex flex-col justify-center min-h-[140px] sm:min-h-[200px]">
        <h3 className="text-xs sm:text-sm font-medium text-ink-faint uppercase tracking-wide mb-1">Braki godzin</h3>
        <p className="text-2xl sm:text-3xl font-bold text-danger tabular-nums">{brakiGodzin}</p>
        <p className="text-xs sm:text-sm text-ink-faint mt-1 leading-snug">godz. łącznie do uzupełnienia</p>
      </Card>

      {/* Kafelek: Nadwyżki */}
      <Card padding="sm" className="flex flex-col justify-center min-h-[140px] sm:min-h-[200px]">
        <h3 className="text-xs sm:text-sm font-medium text-ink-faint uppercase tracking-wide mb-1">Nadwyżki</h3>
        <p className="text-2xl sm:text-3xl font-bold text-ok tabular-nums">{nadwyzkiGodzin}</p>
        <p className="text-xs sm:text-sm text-ink-faint mt-1 leading-snug">godz. łącznie ponad wymóg</p>
      </Card>
    </div>
  );
}
