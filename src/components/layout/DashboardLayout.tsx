'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import RedirectIfNoTypySzkol from './RedirectIfNoTypySzkol';
import { IconMenu } from '@/shared/ui/nav-icons';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <RedirectIfNoTypySzkol>
      <div className="flex min-h-dvh bg-edu-bg">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-h-dvh flex-1 min-w-0 flex-col lg:pl-64">
          <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-edu-border bg-edu-bg/90 px-4 py-3 backdrop-blur-md lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="edu-focus-ring edu-press -ml-2 inline-flex shrink-0 items-center justify-center rounded-lg p-2.5 text-edu-muted hover:bg-edu-border/40 hover:text-edu-ink"
              aria-label="Otwórz menu"
            >
              <IconMenu />
            </button>
            <div className="min-w-0">
              <p className="font-serif text-[15px] font-semibold text-edu-ink">EduGrid</p>
              <p className="truncate text-[11px] font-medium uppercase tracking-wider text-edu-muted">Panel roboczy</p>
            </div>
          </header>
          <main className="edu-surface-subtle flex-1 animate-edu-enter">
            <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:py-8">{children}</div>
          </main>
        </div>
      </div>
    </RedirectIfNoTypySzkol>
  );
}
