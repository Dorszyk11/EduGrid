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
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 overflow-x-hidden w-full min-w-0 ml-0 lg:ml-64">
          {/* Pasek mobile: hamburger + tytuł */}
          <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-gray-100 border-b border-gray-200 lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900"
              aria-label="Otwórz menu"
            >
              <span className="text-xl" aria-hidden>☰</span>
            </button>
            <span className="font-semibold text-gray-800">EduGrid</span>
          </header>
          {children}
        </main>
      </div>
    </RedirectIfNoTypySzkol>
  );
}
