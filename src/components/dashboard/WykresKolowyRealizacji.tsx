'use client';

interface WykresKolowyRealizacjiProps {
  /** Procent realizacji (może być >100 przy nadwyżkach) */
  procent: number;
  /** Opcjonalna etykieta pod wykresem */
  label?: string;
  /** Średnica w px */
  size?: number;
  className?: string;
}

/** Wykres kołowy (donut) pokazujący procent realizacji. */
export default function WykresKolowyRealizacji({
  procent,
  label = 'Realizacja',
  size = 160,
  className = '',
}: WykresKolowyRealizacjiProps) {
  const val = Math.max(0, Number(procent));
  const clamped = Math.min(100, val); // do rysowania koła
  const r = (size - 16) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * (r - strokeWidth / 2);
  const offset = circumference - (clamped / 100) * circumference;
  const procentTekst = Math.round(val * 10) / 10;

  // Ton wg progu realizacji — spójny z paletą statusu (ok / warn / danger).
  const tonColor =
    clamped >= 80 ? 'text-ok' : clamped >= 50 ? 'text-warn' : 'text-danger';

  return (
    <div
      className={`flex flex-col items-center ${className}`}
      role="img"
      aria-label={`${label}: ${procentTekst}%`}
    >
      <svg width={size} height={size} className="transform -rotate-90" aria-hidden>
        <circle
          cx={cx}
          cy={cy}
          r={r - strokeWidth / 2}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-line"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r - strokeWidth / 2}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${tonColor} transition-[stroke-dashoffset] duration-300 ease-out motion-reduce:transition-none`}
        />
      </svg>
      <span aria-hidden className="text-2xl font-bold mt-1 text-ink tabular-nums">
        {procentTekst}%
      </span>
      {label && (
        <span aria-hidden className="text-sm text-ink-faint">
          {label}
        </span>
      )}
    </div>
  );
}
