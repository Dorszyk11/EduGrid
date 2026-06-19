import { statusRealizacji, type TonStatusu } from '@/lib/status-realizacji';

/** Mapa tonów → klasy tła/tekstu (jedno miejsce; koncepcyjnie reużyta przez StatusPill). */
const TON_BG: Record<TonStatusu, string> = {
  ok: 'bg-ok-bg text-ok',
  warn: 'bg-warn-bg text-warn',
  danger: 'bg-danger-bg text-danger',
  accent: 'bg-accent-weak text-accent-strong',
};

/**
 * Komórka statusu realizacji (wariant B: liczba + znak). Render `<td>`-friendly `<span>`
 * z tłem tonu; status nie jest przekazywany samym kolorem — zawiera liczby, znak i `aria-label`.
 */
export default function KomorkaStatusu({ zrealizowane, docelowe, className = '' }:
  { zrealizowane: number; docelowe: number; className?: string }) {
  const s = statusRealizacji(zrealizowane, docelowe);
  return (
    <span
      aria-label={`${zrealizowane} z ${docelowe}, ${s.opis}`}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-2 py-0.5 text-sm font-semibold tabular-nums ${TON_BG[s.ton]} ${className}`}
    >
      <span>{zrealizowane} / {docelowe}</span>
      <span aria-hidden className="opacity-50">·</span>
      <span aria-hidden>{s.znak}</span>
    </span>
  );
}
