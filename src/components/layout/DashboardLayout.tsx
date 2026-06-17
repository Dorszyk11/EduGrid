'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import RedirectIfNoTypySzkol from './RedirectIfNoTypySzkol';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <RedirectIfNoTypySzkol>
      <div className="flex min-h-screen bg-bg">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="page-enter flex-1 overflow-x-hidden w-full min-w-0 ml-0 lg:ml-64">
          {/* Pasek mobile: hamburger + tytuł */}
          <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-surface border-b border-line lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded text-ink-soft hover:bg-bg hover:text-ink"
              aria-label="Otwórz menu"
            >
              <span className="text-xl" aria-hidden>☰</span>
            </button>
            <span className="font-display font-semibold text-ink">EduGrid</span>
          </header>
          {children}
        </main>
      </div>
    </RedirectIfNoTypySzkol>
  );
}
