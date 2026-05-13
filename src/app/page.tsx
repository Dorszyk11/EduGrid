'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import RedirectIfNoTypySzkol from '@/components/layout/RedirectIfNoTypySzkol';
import { useAuth } from '@/components/auth/AuthContext';
import { IconLock } from '@/shared/ui/nav-icons';

export default function HomePage() {
  const { user, loading, login, register, logout } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [imie, setImie] = useState('');
  const [nazwisko, setNazwisko] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      fetch('/api/auth/warmup').catch(() => {});
    }
  }, [loading, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (tab === 'login') {
        const result = await login(email, password, rememberMe);
        if (result.error) setError(result.error);
      } else {
        const timeoutMs = 70000;
        const result = await Promise.race([
          register(email, password, imie, nazwisko),
          new Promise<{ error?: string }>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), timeoutMs),
          ),
        ]).catch((err) => {
          if (err?.message === 'timeout')
            return { error: 'Rejestracja trwa zbyt długo. Odśwież stronę, odczekaj chwilę i spróbuj ponownie.' };
          return { error: 'Wystąpił błąd. Spróbuj ponownie.' };
        });
        if (result.error) setError(result.error);
        else setTab('login');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-edu-bg edu-surface-subtle px-4">
        <div className="text-center">
          <div className="edu-spinner mx-auto h-12 w-12" role="status" aria-label="Ładowanie" />
          <p className="mt-4 text-sm font-medium text-edu-muted">Inicjalizacja aplikacji...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <RedirectIfNoTypySzkol>
        <div className="flex min-h-dvh flex-col lg:flex-row">
          <aside className="edu-login-panel relative overflow-hidden px-8 py-12 text-white lg:flex lg:w-[42%] lg:flex-col lg:justify-between lg:py-16 lg:pl-14 lg:pr-12">
            <div className="relative z-[1] max-w-md">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                Środowisko zarządzania planem nauczania
              </p>
              <h1 className="font-serif mt-6 text-3xl font-semibold tracking-tight sm:text-4xl leading-tight">
                EduGrid
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-white/85">
                Przygotowujcie siatkę godzin zgodnie z harmonogramami Ministerstwa Edukacji i Nauki,
                przydzielajcie realizację oraz szacujcie realne potrzeby kadrowe dla szkoły.
              </p>
              <ul className="mt-10 space-y-4 text-sm text-white/80">
                <li className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-edu-accent-muted" aria-hidden />
                  Zgodność z aktualnym planem ramowym i rejestrem przedmiotów.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-edu-accent-muted" aria-hidden />
                  Przejrzysty podgląd obciążenia pracą nauczycieli wg przedmiotów.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-edu-accent-muted" aria-hidden />
                  Raporty przydatne w pracy dyrekcji i przy planowaniu zatrudnień.
                </li>
              </ul>
            </div>
            <p className="relative z-[1] mt-12 text-xs text-white/40 lg:mt-auto">
              Dostęp do pełnego panelu następuje po uwierzytelnieniu.
            </p>
          </aside>
          <div className="flex flex-1 items-center justify-center bg-edu-bg edu-surface-subtle px-4 py-14 sm:px-8 animate-edu-enter">
            <div className="w-full max-w-lg rounded-2xl border border-edu-border bg-edu-surface px-8 py-10 shadow-edu">
              <h2 className="font-serif text-2xl font-semibold text-edu-ink">Witamy ponownie</h2>
              <p className="mt-2 text-sm leading-relaxed text-edu-muted">
                Zalogowano jako{' '}
                <strong className="font-semibold text-edu-ink">
                  {[user.imie, user.nazwisko].filter(Boolean).join(' ') || user.email}
                </strong>
                .
              </p>
              <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
                <Link
                  href="/dashboard"
                  className="edu-focus-ring edu-press inline-flex min-h-12 flex-1 items-center justify-center rounded-lg bg-edu-accent px-6 py-3 text-center text-sm font-semibold text-white shadow-edu-inner transition-colors duration-150 hover:bg-edu-accent-hover"
                >
                  Przejdź do panelu
                </Link>
                <Link
                  href="/panel-admin"
                  className="edu-focus-ring edu-press inline-flex min-h-12 flex-1 items-center justify-center rounded-lg border border-edu-border-strong bg-edu-bg-subtle px-6 py-3 text-center text-sm font-semibold text-edu-ink transition-colors hover:border-edu-accent-muted hover:bg-edu-surface"
                >
                  Konfiguracja systemu
                </Link>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                className="edu-focus-ring mt-6 text-sm font-semibold text-edu-accent underline-offset-4 hover:text-edu-accent-hover hover:underline"
              >
                Wyloguj się
              </button>
            </div>
          </div>
        </div>
      </RedirectIfNoTypySzkol>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="edu-login-panel relative shrink-0 overflow-hidden px-8 py-10 text-white lg:flex lg:w-[44%] lg:flex-col lg:justify-between lg:py-14 lg:pl-14 lg:pr-12">
        <div className="relative z-[1] max-w-lg lg:mx-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
            Narzędzie dla placówek oświatowych
          </p>
          <h1 className="font-serif mt-5 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.65rem] leading-tight">
            Planowanie siatki godzin zgodnych z wytycznymi MEiN
          </h1>
          <p className="mt-6 text-[15px] leading-relaxed text-white/82">
            Ewidencjonuj realizację zajęć, kontroluj wymogi godzin dla każdego rocznika i buduj
            wiarygodny obraz zapotrzebowania na nauczycieli — w jednym, spójnym interfejsie.
          </p>
        </div>
        <div className="relative z-[1] mt-10 hidden text-sm text-white/45 lg:block">
          <p className="max-w-sm leading-relaxed">
            Zachowaj porządek dokumentacyjny przed kontrolami i zestawiaj dane zespołowi pedagoga w
            czytelnej formie tabelarycznej.
          </p>
        </div>
      </aside>

      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-10 lg:py-16 animate-edu-enter">
        <div className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-edu-border bg-edu-surface shadow-edu">
          <div className="border-b border-edu-border bg-edu-bg-subtle/70 px-6 py-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-edu-navy text-white">
                <IconLock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-serif text-xl font-semibold text-edu-ink">EduGrid</h2>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-edu-muted">
                  Bezpieczny dostęp dla personelu szkoły
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px border-b border-edu-border bg-edu-border">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError('');
              }}
              role="tab"
              aria-selected={tab === 'login'}
              className={[
                'edu-focus-ring relative bg-edu-surface py-4 text-[13px] font-semibold transition-colors duration-150',
                tab === 'login'
                  ? 'text-edu-ink'
                  : 'bg-edu-bg-subtle text-edu-muted hover:text-edu-ink edu-press',
              ].join(' ')}
            >
              Logowanie
              <span
                className={`absolute inset-x-4 bottom-0 h-0.5 rounded-full transition-all duration-200 ease-edu-out ${
                  tab === 'login' ? 'bg-edu-accent opacity-100' : 'bg-edu-accent opacity-0'
                }`}
                aria-hidden
              />
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError('');
              }}
              role="tab"
              aria-selected={tab === 'register'}
              className={[
                'edu-focus-ring relative bg-edu-surface py-4 text-[13px] font-semibold transition-colors duration-150',
                tab === 'register'
                  ? 'text-edu-ink'
                  : 'bg-edu-bg-subtle text-edu-muted hover:text-edu-ink edu-press',
              ].join(' ')}
            >
              Nowe konto
              <span
                className={`absolute inset-x-4 bottom-0 h-0.5 rounded-full transition-all duration-200 ease-edu-out ${
                  tab === 'register' ? 'bg-edu-accent opacity-100' : 'bg-edu-accent opacity-0'
                }`}
                aria-hidden
              />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-6 sm:p-7">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-edu-danger-soft px-4 py-3 text-sm font-medium text-edu-danger"
              >
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-semibold text-edu-ink">
                Adres e-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="block w-full min-h-11 rounded-lg border border-edu-border-strong bg-edu-surface px-3 py-2.5 text-sm transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-edu-accent focus:ring-offset-2 focus:ring-offset-edu-surface"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-semibold text-edu-ink">
                Hasło
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                minLength={tab === 'register' ? 8 : undefined}
                className="block w-full min-h-11 rounded-lg border border-edu-border-strong bg-edu-surface px-3 py-2.5 text-sm transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-edu-accent focus:ring-offset-2 focus:ring-offset-edu-surface"
              />
              {tab === 'register' && (
                <p className="mt-1.5 text-xs font-medium text-edu-muted">Minimum 8 znaków.</p>
              )}
              {tab === 'login' && (
                <label className="edu-focus-ring mt-3 inline-flex cursor-pointer select-none items-center gap-3 rounded-lg">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-edu-border-strong text-edu-accent focus:ring-edu-accent"
                  />
                  <span className="text-sm font-medium text-edu-ink">
                    Zapamiętaj mnie na tym urządzeniu
                  </span>
                </label>
              )}
            </div>
            {tab === 'register' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="imie" className="mb-1 block text-sm font-semibold text-edu-ink">
                    Imię
                  </label>
                  <input
                    id="imie"
                    type="text"
                    value={imie}
                    onChange={(e) => setImie(e.target.value)}
                    required={tab === 'register'}
                    autoComplete="given-name"
                    className="block w-full min-h-11 rounded-lg border border-edu-border-strong bg-edu-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-edu-accent focus:ring-offset-2 focus:ring-offset-edu-surface"
                  />
                </div>
                <div>
                  <label htmlFor="nazwisko" className="mb-1 block text-sm font-semibold text-edu-ink">
                    Nazwisko
                  </label>
                  <input
                    id="nazwisko"
                    type="text"
                    value={nazwisko}
                    onChange={(e) => setNazwisko(e.target.value)}
                    required={tab === 'register'}
                    autoComplete="family-name"
                    className="block w-full min-h-11 rounded-lg border border-edu-border-strong bg-edu-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-edu-accent focus:ring-offset-2 focus:ring-offset-edu-surface"
                  />
                </div>
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="edu-focus-ring edu-press flex min-h-12 w-full items-center justify-center rounded-lg bg-edu-accent px-4 py-3 text-sm font-semibold text-white shadow-edu-inner transition-colors duration-150 hover:bg-edu-accent-hover disabled:pointer-events-none disabled:opacity-45"
            >
              {submitting ? 'Trwa przetwarzanie…' : tab === 'login' ? 'Zaloguj się' : 'Załóż konto'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
