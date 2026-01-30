'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Przydział', href: '/przydzial', icon: '⚙️' },
  { name: 'Plany MEiN', href: '/plany-mein', icon: '🏫' },
  { name: 'Import MEiN', href: '/import/mein-pdf', icon: '📥' },
  { name: 'Raporty', href: '/raporty', icon: '📈' },
  { name: 'Panel admina', href: '/panel-admin', icon: '⚙️' },
  { name: 'Klasy', href: '/klasy', icon: '👥' },
  { name: 'Nauczyciele', href: '/admin/collections/nauczyciele', icon: '👨‍🏫' },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open = true, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile: overlay gdy sidebar otwarty */}
      {open && (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          aria-label="Zamknij menu"
        />
      )}
      <aside
        className={`
          fixed left-0 top-0 z-30 h-screen w-64 bg-gray-900 text-white flex flex-col
          transition-transform duration-200 ease-out
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo + przycisk zamknij na mobile */}
        <div className="p-4 sm:p-6 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">EduGrid</h1>
            <p className="text-sm text-gray-400 mt-1">System siatki godzin</p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-2 -m-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              aria-label="Zamknij menu"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }
                `}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 shrink-0">
          <p className="text-xs text-gray-500 text-center">EduGrid v1.0</p>
        </div>
      </aside>
    </>
  );
}
