'use client';

import type { ReactNode } from 'react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import {
  IconAbacus,
  IconAcademic,
  IconCalendar,
  IconChart,
  IconClipboard,
  IconClose,
  IconCog,
  IconChevron,
  IconLock,
  IconSliders,
  IconUsers,
} from '@/shared/ui/nav-icons';

interface NavItem {
  name: string;
  href: string;
  icon: ReactNode;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: <IconChart /> },
  { name: 'Przydział', href: '/przydzial', icon: <IconSliders /> },
  { name: 'Realizacja', href: '/realizacja', icon: <IconCalendar /> },
  { name: 'Dyspozycja', href: '/dyspozycja', icon: <IconClipboard /> },
  {
    name: 'Nauczyciele wg przedmiotów',
    href: '/zapotrzebowanie-kadrowe',
    icon: <IconAbacus />,
  },
  { name: 'Klasy', href: '/klasy', icon: <IconUsers /> },
  { name: 'Nauczyciele', href: '/nauczyciele', icon: <IconAcademic /> },
  { name: 'Panel admina', href: '/panel-admin', icon: <IconCog /> },
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
      {open && (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-20 bg-edu-navy/40 backdrop-blur-[2px] transition-opacity duration-200 ease-edu-out lg:hidden"
          aria-label="Zamknij menu"
        />
      )}
      <aside
        className={[
          'fixed left-0 top-0 z-30 flex h-dvh w-64 flex-col border-r border-white/10 bg-edu-navy text-white',
          'shadow-edu transition-transform duration-200 ease-edu-out',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
        aria-label="Menu główne"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-5 sm:px-5">
          <div>
            <h1 className="font-serif text-xl font-semibold tracking-tight text-white">EduGrid</h1>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-widest text-white/55">
              Siatki godzin · MEiN
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="edu-focus-ring edu-press shrink-0 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Zamknij menu"
            >
              <IconClose />
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={[
                  'edu-focus-ring group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 ease-edu-out',
                  isActive
                    ? 'bg-white/[0.12] text-white ring-1 ring-white/15'
                    : 'text-white/75 hover:bg-white/[0.07] hover:text-white',
                ].join(' ')}
              >
                <span
                  className={[
                    'mt-0.5 shrink-0 text-white/80 transition-colors duration-150',
                    isActive ? 'text-edu-accent-muted' : 'group-hover:text-white',
                  ].join(' ')}
                  aria-hidden
                >
                  {item.icon}
                </span>
                <span className="text-[13px] font-medium leading-snug">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-2 border-t border-white/10 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-3">
              <span className="text-xs font-medium uppercase tracking-wide text-white/45">Ładowanie…</span>
            </div>
          ) : user ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="edu-focus-ring flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-white/90 transition-colors duration-150 hover:bg-white/[0.08]"
                aria-expanded={profileOpen}
                aria-haspopup="dialog"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-edu-accent text-sm font-semibold text-white shadow-edu-inner">
                  {displayName.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{displayName}</span>
                <IconChevron up={profileOpen} className="shrink-0 text-white/50" />
              </button>
              {profileOpen && (
                <div
                  role="dialog"
                  aria-label="Profil"
                  className="absolute inset-x-0 bottom-full mb-2 rounded-xl border border-white/10 bg-edu-navy-soft py-3 px-3 shadow-edu outline outline-1 outline-white/10"
                >
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/45">Profil</p>
                  <p className="truncate text-sm font-medium text-white">
                    {[user.imie, user.nazwisko].filter(Boolean).join(' ') || '—'}
                  </p>
                  <p className="mt-1 truncate text-xs text-white/55">{user.email}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      onClose?.();
                      logout();
                    }}
                    className="edu-focus-ring mt-3 w-full rounded-lg py-2.5 text-center text-sm font-medium text-red-200 transition-colors hover:bg-red-950/40"
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
              className="edu-focus-ring edu-press flex items-center justify-center gap-2 rounded-lg bg-edu-accent px-4 py-3 text-center text-sm font-semibold text-white shadow-edu-inner transition-colors duration-150 hover:bg-edu-accent-hover"
            >
              <IconLock className="h-4 w-4" />
              Zaloguj się
            </Link>
          )}
          <p className="text-center text-[10px] font-medium uppercase tracking-wider text-white/35">Wersja aplikacji 1.0</p>
        </div>
      </aside>
    </>
  );
}
