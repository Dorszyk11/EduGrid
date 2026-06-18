'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';

type IconName =
  | 'dashboard' | 'przydzial' | 'realizacja' | 'dyspozycja'
  | 'kadry' | 'klasy' | 'nauczyciele' | 'admin';

interface NavItem {
  name: string;
  href: string;
  icon: IconName;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { name: 'Przydział', href: '/przydzial', icon: 'przydzial' },
  { name: 'Realizacja', href: '/realizacja', icon: 'realizacja' },
  { name: 'Dyspozycja', href: '/dyspozycja', icon: 'dyspozycja' },
  { name: 'Nauczyciele wg przedmiotów', href: '/zapotrzebowanie-kadrowe', icon: 'kadry' },
  { name: 'Klasy', href: '/klasy', icon: 'klasy' },
  { name: 'Nauczyciele', href: '/nauczyciele', icon: 'nauczyciele' },
  { name: 'Panel admina', href: '/panel-admin', icon: 'admin' },
];

/** Proste, geometryczne ikony liniowe (24×24, currentColor) — w duchu „siatki". */
function NavIcon({ name }: { name: IconName }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (name) {
    case 'dashboard':
      return (<svg {...common}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>);
    case 'przydzial':
      return (<svg {...common}><line x1="4" y1="7" x2="20" y2="7" /><circle cx="9" cy="7" r="2" /><line x1="4" y1="17" x2="20" y2="17" /><circle cx="15" cy="17" r="2" /></svg>);
    case 'realizacja':
      return (<svg {...common}><rect x="3" y="4" width="18" height="17" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" /></svg>);
    case 'dyspozycja':
      return (<svg {...common}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="M8.5 11l1.5 1.5L13 9" /><line x1="8" y1="16" x2="16" y2="16" /></svg>);
    case 'kadry':
      return (<svg {...common}><rect x="4" y="3" width="16" height="18" rx="2" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="16" x2="13" y2="16" /></svg>);
    case 'klasy':
      return (<svg {...common}><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.2" /><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" /><path d="M15.5 20c0-2 1.2-3.5 3-3.5s2.5 1 2.5 3" /></svg>);
    case 'nauczyciele':
      return (<svg {...common}><circle cx="12" cy="8" r="3.2" /><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" /></svg>);
    case 'admin':
      return (<svg {...common}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></svg>);
  }
}

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
      {/* Mobile: przyciemnienie tła gdy menu otwarte */}
      {open && (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-20 bg-navy/60 lg:hidden"
          aria-label="Zamknij menu"
        />
      )}
      <aside
        className={`
          fixed left-0 top-0 z-30 h-screen w-64 bg-navy text-slate-300 flex flex-col
          border-r border-navy-line
          transition-transform duration-200 ease-brand
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="h-16 px-5 border-b border-navy-line flex items-center justify-between shrink-0">
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-2.5 group">
            <span className="grid h-8 w-8 place-items-center rounded-sm bg-accent text-white font-display font-bold text-sm shadow-xs">
              EG
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-white">
              EduGrid
            </span>
          </Link>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-2 -mr-2 rounded-sm text-slate-400 hover:text-white hover:bg-navy-2"
              aria-label="Zamknij menu"
            >
              ✕
            </button>
          )}
        </div>

        {/* Nawigacja */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" aria-label="Główne">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  relative flex items-center gap-3 rounded px-3 py-2.5 text-sm transition-colors duration-150 ease-brand
                  ${isActive
                    ? 'bg-white/[0.07] text-white font-medium before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-accent'
                    : 'text-slate-300 hover:bg-white/4 hover:text-white'
                  }
                `}
              >
                <span className={isActive ? 'text-accent' : 'text-slate-400'}>
                  <NavIcon name={item.icon} />
                </span>
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Stopka: profil / logowanie */}
        <div className="p-3 border-t border-navy-line shrink-0">
          {loading ? (
            <div className="flex items-center justify-center py-2">
              <span className="text-xs text-slate-500">Ładowanie…</span>
            </div>
          ) : user ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-sm text-left hover:bg-white/4 transition-colors"
                aria-expanded={profileOpen}
                aria-haspopup="true"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-white font-medium text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 min-w-0 truncate font-medium text-sm text-slate-100">
                  {displayName}
                </span>
                <span className="text-slate-500 text-xs shrink-0" aria-hidden>
                  {profileOpen ? '▲' : '▼'}
                </span>
              </button>
              {profileOpen && (
                <div className="absolute left-0 right-0 bottom-full mb-1 py-3 px-4 rounded-card bg-navy-2 border border-navy-line shadow-pop min-w-48">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Profil</p>
                  <p className="text-sm font-medium text-white truncate">
                    {[user.imie, user.nazwisko].filter(Boolean).join(' ') || '–'}
                  </p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      onClose?.();
                      logout();
                    }}
                    className="mt-3 w-full py-2 px-3 text-sm font-medium text-red-300 hover:text-red-200 hover:bg-white/5 rounded-sm transition-colors"
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
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm bg-accent text-white font-medium text-sm hover:bg-accent-strong transition-colors"
            >
              Zaloguj się
            </Link>
          )}
          <p className="mt-2 text-[11px] text-slate-500 text-center tabular">EduGrid v1.0</p>
        </div>
      </aside>
    </>
  );
}
