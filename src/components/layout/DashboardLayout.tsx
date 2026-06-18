'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import AppBar from './AppBar';
import { PageChromeProvider } from './PageChromeContext';
import RedirectIfNoTypySzkol from './RedirectIfNoTypySzkol';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Powłoka aplikacji (AppShell): `Sidebar` + sticky `AppBar` + obszar treści.
 * `PageChromeProvider` zbiera meta strony (tytuł/opis/akcje) z `PageHeader`
 * i pokazuje je w `AppBar`. Hamburger mobilny żyje w `AppBar`.
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <RedirectIfNoTypySzkol>
      <PageChromeProvider>
        <div className="flex min-h-screen bg-bg">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 min-w-0 w-full ml-0 lg:ml-64 flex flex-col">
            <AppBar onOpenMenu={() => setSidebarOpen(true)} />
            <main className="page-enter flex-1 overflow-x-hidden w-full min-w-0 motion-reduce:animate-none">
              {children}
            </main>
          </div>
        </div>
      </PageChromeProvider>
    </RedirectIfNoTypySzkol>
  );
}
