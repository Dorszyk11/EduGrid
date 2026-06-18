'use client';

import { useCallback, type KeyboardEvent } from 'react';

export interface KomorkaKlawiaturaProps {
  role: 'button';
  tabIndex: 0;
  onKeyDown: (e: KeyboardEvent) => void;
  onClick: () => void;
}

/**
 * Daje klikalnej komórce semantykę przycisku dostępną z klawiatury.
 * Enter/Space → `onActivate` (Space z `preventDefault`, by nie przewijać strony).
 * Spread na element; konsument dokłada `aria-label` i klasę `focus-visible:outline …`.
 *
 *   const props = useKomorkaKlawiatura(() => dodajRealizacje(...));
 *   <td {...props} aria-label="Dodaj realizację: …" className="focus-visible:outline-2 outline-accent" />
 */
export function useKomorkaKlawiatura(onActivate: () => void): KomorkaKlawiaturaProps {
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        onActivate();
      }
    },
    [onActivate],
  );

  return {
    role: 'button',
    tabIndex: 0,
    onKeyDown,
    onClick: onActivate,
  };
}
