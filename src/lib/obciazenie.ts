/**
 * Źródło prawdy dla statusu obciążenia nauczyciela w raporcie obciążeń.
 * Wydzielone z inline-ternary w `src/app/raporty/[typ]/page.tsx` (audyt [3]),
 * żeby mapowanie progów było nazwane i testowalne. Zachowanie 1:1 z oryginałem.
 *
 * Progi: aktualne > max → przeciążenie; ≥90% → pełne; <50% → niskie; inaczej w normie.
 * Uwaga: dashboard używa innej skali (PEŁNE przy ==max) — to osobne mapowanie.
 */
export interface StatusObciazenia {
  /** Klucz statusu dla StatusPill (PRZECIĄŻENIE | OK | NIEDOCIĄŻENIE | NEUTRAL). */
  key: string;
  /** Etykieta wyświetlana użytkownikowi. */
  label: string;
}

export function statusObciazeniaRaport(
  aktualneObciazenie: number,
  maxObciazenie: number,
  procentWykorzystania: number,
): StatusObciazenia {
  if (aktualneObciazenie > maxObciazenie) {
    return { label: 'Przekroczone', key: 'PRZECIĄŻENIE' };
  }
  if (procentWykorzystania >= 90) {
    return { label: 'Pełne', key: 'OK' };
  }
  if (procentWykorzystania < 50) {
    return { label: 'Niskie', key: 'NIEDOCIĄŻENIE' };
  }
  return { label: 'W normie', key: 'NEUTRAL' };
}
