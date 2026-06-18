'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import { breadcrumbDla } from '@/lib/nawigacja';
import { usePageChromeValue } from './PageChromeContext';

interface AppBarProps {
  /** Otwiera mobilny sidebar (hamburger widoczny < lg). */
  onOpenMenu: () => void;
}

/**
 * Górny pasek aplikacji (sticky): okruszki (z `nawigacja.ts`), tytuł strony
 * (display) i slot akcji — oba czytane z `PageChromeContext`. Na wąskich
 * ekranach po lewej hamburger otwierający `Sidebar`.
 */
export default function AppBar({ onOpenMenu }: AppBarProps) {
  const pathname = usePathname();
  const { title, description, actions } = usePageChromeValue();
  const okruszki = breadcrumbDla(pathname ?? '');

  return (
    <header className="sticky top-0 z-20 bg-surface border-b border-line">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          className="p-2 -ml-2 rounded-sm text-ink-soft hover:bg-bg hover:text-ink lg:hidden"
          aria-label="Otwórz menu"
        >
          <span className="text-xl leading-none" aria-hidden>☰</span>
        </button>

        <div className="min-w-0 flex-1">
          <nav aria-label="Okruszki" className="hidden sm:block">
            <ol className="flex items-center gap-1.5 text-xs text-ink-faint">
              {okruszki.map((okruszek, i) => {
                const ostatni = i === okruszki.length - 1;
                return (
                  <Fragment key={`${okruszek.href}-${i}`}>
                    {i > 0 && (
                      <li aria-hidden className="text-line-strong">
                        <Icon name="chevron-right" size={12} />
                      </li>
                    )}
                    <li>
                      {ostatni ? (
                        <span aria-current="page" className="text-ink-soft">
                          {okruszek.label}
                        </span>
                      ) : (
                        <Link
                          href={okruszek.href}
                          className="rounded-sm hover:text-ink hover:underline"
                        >
                          {okruszek.label}
                        </Link>
                      )}
                    </li>
                  </Fragment>
                );
              })}
            </ol>
          </nav>
          {title && (
            <h1 className="font-display text-xl font-semibold tracking-tight text-ink truncate">
              {title}
            </h1>
          )}
          {description && (
            <p className="mt-0.5 text-sm text-ink-soft truncate">{description}</p>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
