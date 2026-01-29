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

    fetch('/api/typy-szkol')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('fetch failed'))))
      .then((data) => {
        const hasTypy = Array.isArray(data) && data.length > 0;
        if (!hasTypy) {
          setStatus('redirect');
          router.replace('/import/mein-pdf');
        } else {
          setStatus('ok');
        }
      })
      .catch(() => setStatus('ok'));
  }, [pathname, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900" />
          <p className="mt-4 text-gray-600">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (status === 'redirect') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="mt-4 text-gray-600">Przekierowanie do importu MEiN...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
