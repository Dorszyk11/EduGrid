'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const EXCLUDE_PREFIXES = ['/import', '/admin', '/plany-mein', '/szkoly', '/panel-admin'];

interface RedirectIfNoTypySzkolProps {
  children: React.ReactNode;
}

export default function RedirectIfNoTypySzkol({ children }: RedirectIfNoTypySzkolProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'redirect' | 'ok'>('loading');

  useEffect(() => {
    const excluded = EXCLUDE_PREFIXES.some((p) => pathname?.startsWith(p));
    if (excluded) {
      setStatus('ok');
      return;
    }

    // Timeout chroni przed zawieszonym żądaniem (zimny pooler DB): zamiast
    // wiecznego spinnera blokującego całą aplikację, po przekroczeniu czasu
    // wpuszczamy użytkownika do środka (fail-open).
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    fetch('/api/typy-szkol', { cache: 'no-store', signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('fetch failed'))))
      .then((data) => {
        const hasTypy = Array.isArray(data) && data.length > 0;
        if (!hasTypy) {
          setStatus('redirect');
          router.replace('/plany-mein');
        } else {
          setStatus('ok');
        }
      })
      .catch(() => setStatus('ok'))
      .finally(() => clearTimeout(timeoutId));

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [pathname, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-accent" />
          <p className="mt-4 text-ink-soft">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (status === 'redirect') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-accent" />
          <p className="mt-4 text-ink-soft">Przekierowanie do planów MEiN...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
