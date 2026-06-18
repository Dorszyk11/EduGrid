'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import Icon from '@/components/ui/Icon';
import { NAWIGACJA } from '@/lib/nawigacja';

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
              <Icon name="close" size={18} />
            </button>
          )}
        </div>

        {/* Nawigacja */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto" aria-label="Główne">
          {NAWIGACJA.map((grupa, gi) => (
            <div key={grupa.label ?? `grupa-${gi}`}>
              {grupa.label && (
                <p className="text-[10px] uppercase tracking-wide text-slate-500 px-3 pt-4 pb-1">
                  {grupa.label}
                </p>
              )}
              {grupa.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
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
                      <Icon name={item.icon} size={20} />
                    </span>
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}
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
                <span className="text-slate-500 shrink-0">
                  <Icon name="chevron-down" size={16} className={profileOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
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
