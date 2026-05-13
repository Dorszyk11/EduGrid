'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const EXCLUDE_PREFIXES = ['/import', '/admin', '/plany-mein', '/szkoly', '/panel-admin'];

interface RedirectIfNoTypySzkolProps {
  children: React.ReactNode;
}

function LoaderShell({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-edu-bg edu-surface-subtle px-4">
      <div className="w-full max-w-sm rounded-2xl border border-edu-border bg-edu-surface px-8 py-10 text-center shadow-edu">
        <div className="edu-spinner mx-auto h-11 w-11" role="status" aria-busy />
        <p className="mt-5 text-sm font-semibold text-edu-ink">{title}</p>
        {subtitle && <p className="mt-1 text-xs leading-relaxed text-edu-muted">{subtitle}</p>}
      </div>
    </div>
  );
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

    fetch('/api/typy-szkol', { cache: 'no-store' })
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
      .catch(() => setStatus('ok'));
  }, [pathname, router]);

  if (status === 'loading') {
    return <LoaderShell title="Przygotowywanie danych szkoły…" subtitle="Sprawdzanie typów szkół w systemie." />;
  }

  if (status === 'redirect') {
    return <LoaderShell title="Przekierowanie…" subtitle="Brak typów szkół — przechodzimy do planów MEiN." />;
  }

  return <>{children}</>;
}
