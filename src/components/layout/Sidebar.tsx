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
  { name: 'Siatka szkoły', href: '/siatka-szkoly', icon: '📋' },
  { name: 'Generator przydziału', href: '/przydzial', icon: '⚙️' },
  { name: 'Import MEiN', href: '/import/mein-pdf', icon: '📥' },
  { name: 'Mapowania nazw', href: '/mapowania', icon: '🔗' },
  { name: 'Raporty', href: '/raporty', icon: '📈' },
  { name: 'Typy szkół', href: '/admin/collections/typy-szkol', icon: '🏫' },
  { name: 'Przedmioty', href: '/admin/collections/przedmioty', icon: '📚' },
  { name: 'Klasy', href: '/admin/collections/klasy', icon: '👥' },
  { name: 'Nauczyciele', href: '/admin/collections/nauczyciele', icon: '👨‍🏫' },
  { name: 'Siatki godzin MEiN', href: '/admin/collections/siatki-godzin-mein', icon: '📋' },
  { name: 'Rozkład godzin', href: '/admin/collections/rozkład-godzin', icon: '⏰' },
  { name: 'Panel Admin', href: '/admin', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">EduGrid</h1>
        <p className="text-sm text-gray-400 mt-1">System siatki godzin</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.name}
              href={item.href}
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
      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-500 text-center">
          EduGrid v1.0
        </p>
      </div>
    </div>
  );
}
