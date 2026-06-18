'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

/** Meta strony przekazywana z `PageHeader` (przez `usePageChrome`) do `AppBar`. */
export interface PageChrome {
  title?: string;
  description?: string;
  actions?: ReactNode;
}

interface PageChromeContextValue {
  chrome: PageChrome;
  setChrome: (chrome: PageChrome) => void;
}

const PageChromeContext = createContext<PageChromeContextValue | null>(null);

/**
 * Provider stanu chrome strony. Owija powłokę (`DashboardLayout`), aby `AppBar`
 * mógł odczytać tytuł/opis/akcje ustawione przez bieżący ekran.
 */
export function PageChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChromeState] = useState<PageChrome>({});
  const setChrome = useCallback((next: PageChrome) => setChromeState(next), []);
  return (
    <PageChromeContext.Provider value={{ chrome, setChrome }}>
      {children}
    </PageChromeContext.Provider>
  );
}

/** Odczyt stanu chrome w `AppBar`. */
export function usePageChromeValue(): PageChrome {
  const ctx = useContext(PageChromeContext);
  return ctx?.chrome ?? {};
}

/**
 * Wewnętrzny dostęp do settera. Zwraca `null`, gdy brak Providera — wtedy
 * `PageHeader` renderuje fallback zamiast delegować do `AppBar`.
 */
export function usePageChromeSetter(): ((chrome: PageChrome) => void) | null {
  const ctx = useContext(PageChromeContext);
  return ctx?.setChrome ?? null;
}
