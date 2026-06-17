'use client';

import { useCallback, useEffect, useState } from 'react';

export interface ResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Typowany fetch z jednolitą obsługą loading/error + anulowaniem (AbortController).
 * Usuwa powielony boilerplate `fetch`+`setLadowanie`+`try/catch` ze stron.
 * `deps` sterują ponownym pobraniem (jak w useEffect). `reload()` wymusza odświeżenie.
 */
export function useResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: unknown[] = [],
): ResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);

    fetcher(controller.signal)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((e) => {
        if (!active || controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'Nieznany błąd');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
    // fetcher celowo poza zależnościami — odświeżeniem steruje `deps` + `nonce`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, loading, error, reload };
}
