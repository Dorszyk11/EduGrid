type Tone = 'ok' | 'warn' | 'danger' | 'neutral';

/** Mapowanie statusu domenowego na ton semantyczny (zgodność MEiN + obciążenie nauczyciela). */
const STATUS_TONE: Record<string, Tone> = {
  OK: 'ok',
  'NADWYŻKA': 'warn',
  NADWYZKA: 'warn',
  BRAK: 'danger',
  'PRZECIĄŻENIE': 'danger',
  PRZECIAZENIE: 'danger',
  'NIEDOCIĄŻENIE': 'warn',
  NIEDOCIAZENIE: 'warn',
};

const TONE_CLASS: Record<Tone, string> = {
  ok: 'bg-ok-bg text-ok',
  warn: 'bg-warn-bg text-warn',
  danger: 'bg-danger-bg text-danger',
  neutral: 'bg-surface-2 text-ink-soft',
};

interface StatusPillProps {
  /** Status domenowy (np. 'OK' | 'NADWYŻKA' | 'BRAK'); nieznany → ton neutralny. */
  status: string;
  /** Etykieta do wyświetlenia (domyślnie = status). */
  label?: string;
}

/** Pigułka statusu z kropką i tłem w tonie semantycznym (kontrast AA). */
export default function StatusPill({ status, label }: StatusPillProps) {
  const tone = STATUS_TONE[status.toUpperCase()] ?? 'neutral';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASS[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label ?? status}
    </span>
  );
}
