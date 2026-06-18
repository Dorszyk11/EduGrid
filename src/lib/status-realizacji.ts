/**
 * Jedno źródło prawdy dla progów statusu realizacji godzin (siatka MEiN, kafelki,
 * doradztwo). Wyjęte z duplikatów inline w komponentach — zachowanie 1:1 z dzisiejszą logiką.
 *
 * Progi: zrealizowane > docelowe → nadwyżka (accent); == docelowe → komplet (ok);
 * brakuje 1 → warn; brakuje ≥2 → danger. Gdy docelowe ≤ 0 → brak wymagania = OK.
 */
export type TonStatusu = 'ok' | 'warn' | 'danger' | 'accent';
export interface StatusRealizacji { ton: TonStatusu; roznica: number; znak: string; opis: string; }
export const PUSTA = '—';
const MINUS = '−'; // U+2212

export function statusRealizacji(zrealizowane: number, docelowe: number): StatusRealizacji {
  if (docelowe <= 0) return { ton: 'ok', roznica: 0, znak: 'OK', opis: 'komplet' };
  if (zrealizowane > docelowe) {
    const r = zrealizowane - docelowe;
    return { ton: 'accent', roznica: r, znak: `+${r}`, opis: `nadwyżka ${r}` };
  }
  if (zrealizowane === docelowe) return { ton: 'ok', roznica: 0, znak: 'OK', opis: 'komplet' };
  const brak = docelowe - zrealizowane;
  if (brak === 1) return { ton: 'warn', roznica: -1, znak: `${MINUS}1`, opis: 'brakuje 1' };
  return { ton: 'danger', roznica: -brak, znak: `${MINUS}${brak}`, opis: `brakuje ${brak}` };
}
