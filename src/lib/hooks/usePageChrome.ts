'use client';

import { useEffect, type ReactNode } from 'react';
import { usePageChromeSetter, type PageChrome } from '@/components/layout/PageChromeContext';

/**
 * Ustawia meta bieżącej strony (tytuł/opis/akcje) w kontekście, skąd `AppBar`
 * je renderuje. Czyści stan przy odmontowaniu. Wywoływany przez `PageHeader`
 * (adapter), więc ekrany pozostają bez zmian.
 *
 * Zwraca `true`, gdy Provider jest dostępny (meta przejęta przez AppBar),
 * `false` w przeciwnym razie — wtedy `PageHeader` renderuje fallback in-place.
 */
export function usePageChrome(meta: {
  title: string;
  description?: string;
  actions?: ReactNode;
}): boolean {
  const setChrome = usePageChromeSetter();
  const hasProvider = setChrome !== null;

  useEffect(() => {
    if (!setChrome) return;
    const next: PageChrome = {
      title: meta.title,
      description: meta.description,
      actions: meta.actions,
    };
    setChrome(next);
    return () => setChrome({});
  }, [setChrome, meta.title, meta.description, meta.actions]);

  return hasProvider;
}
