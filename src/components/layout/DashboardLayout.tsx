'use client';

import Sidebar from './Sidebar';
import RedirectIfNoTypySzkol from './RedirectIfNoTypySzkol';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <RedirectIfNoTypySzkol>
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </RedirectIfNoTypySzkol>
  );
}
