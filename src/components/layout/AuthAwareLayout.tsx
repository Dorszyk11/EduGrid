'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import DashboardLayout from './DashboardLayout';

function ScreenLoader({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-edu-bg edu-surface-subtle px-4">
      <div className="w-full max-w-sm rounded-2xl border border-edu-border bg-edu-surface px-8 py-10 text-center shadow-edu">
        <div className="edu-spinner mx-auto h-11 w-11" role="status" aria-label={message} />
        <p className="mt-5 text-sm font-medium text-edu-muted">{message}</p>
      </div>
    </div>
  );
}

export default function AuthAwareLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isHome = pathname === '/';

  useEffect(() => {
    if (loading) return;
    if (!isHome && !user) {
      router.replace('/');
    }
  }, [isHome, user, loading, router]);

  if (loading && !user) {
    return <ScreenLoader message="Ładowanie sesji..." />;
  }

  if (isHome && !user) {
    return <>{children}</>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
