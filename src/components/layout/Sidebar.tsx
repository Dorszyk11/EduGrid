'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Przydział', href: '/przydzial', icon: '⚙️' },
  { name: 'Realizacja', href: '/realizacja', icon: '📅' },
  { name: 'Dyspozycja', href: '/dyspozycja', icon: '📋' },
  { name: 'Klasy', href: '/klasy', icon: '👥' },
  { name: 'Nauczyciele', href: '/nauczyciele', icon: '👨‍🏫' },
  { name: 'Raporty', href: '/raporty', icon: '📈' },
  { name: 'Panel admina', href: '/panel-admin', icon: '⚙️' },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  const displayName = user
    ? [user.imie, user.nazwisko].filter(Boolean).join(' ') || user.email
    : '';

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

        {/* Footer: Zaloguj się / Profil użytkownika */}
        <div className="p-4 border-t border-gray-800 shrink-0 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-2">
              <span className="text-xs text-gray-500">Ładowanie…</span>
            </div>
          ) : user ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-gray-200 hover:bg-gray-800 transition-colors"
                aria-expanded={profileOpen}
                aria-haspopup="true"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-medium text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 min-w-0 truncate font-medium text-sm">
                  {displayName}
                </span>
                <span className="text-gray-500 text-xs shrink-0">
                  {profileOpen ? '▲' : '▼'}
                </span>
              </button>
              {profileOpen && (
                <div className="absolute left-0 right-0 bottom-full mb-1 py-3 px-4 rounded-lg bg-gray-800 border border-gray-700 shadow-xl min-w-[12rem]">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Profil</p>
                  <p className="text-sm font-medium text-white truncate">
                    {[user.imie, user.nazwisko].filter(Boolean).join(' ') || '–'}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      onClose?.();
                      logout();
                    }}
                    className="mt-3 w-full py-2 px-3 text-sm font-medium text-red-300 hover:text-red-200 hover:bg-gray-700/80 rounded-lg transition-colors"
                  >
                    Wyloguj
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/"
              onClick={onClose}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-500 transition-colors"
            >
              <span aria-hidden>🔐</span>
              Zaloguj się
            </Link>
          )}
          <p className="text-xs text-gray-500 text-center">EduGrid v1.0</p>
        </div>
      </aside>
    </>
  );
}
