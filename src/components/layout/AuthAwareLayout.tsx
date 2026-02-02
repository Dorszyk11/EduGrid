'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import DashboardLayout from './DashboardLayout';

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="mt-4 text-gray-600">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (isHome && !user) {
    return <>{children}</>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
