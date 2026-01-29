'use client';

interface WykresKolowyRealizacjiProps {
  /** Procent realizacji 0–100 */
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
  const clamped = Math.min(100, Math.max(0, Number(procent)));
  const r = (size - 16) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * (r - strokeWidth / 2);
  const offset = circumference - (clamped / 100) * circumference;

  const color =
    clamped >= 100
      ? 'stroke-emerald-500'
      : clamped >= 80
        ? 'stroke-green-400'
        : clamped >= 60
          ? 'stroke-amber-400'
          : clamped >= 40
            ? 'stroke-orange-400'
            : 'stroke-red-400';

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={cx}
          cy={cy}
          r={r - strokeWidth / 2}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r - strokeWidth / 2}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={color}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span className="text-2xl font-bold mt-1 text-gray-800">{Math.round(clamped)}%</span>
      {label && <span className="text-sm text-gray-500">{label}</span>}
    </div>
  );
}
