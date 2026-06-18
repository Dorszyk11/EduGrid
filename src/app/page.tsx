'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import RedirectIfNoTypySzkol from '@/components/layout/RedirectIfNoTypySzkol';
import { useAuth } from '@/components/auth/AuthContext';

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

  // Rozgrzewa Payload/połączenie z bazą od razu po pokazaniu formularza – rejestracja będzie szybsza
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
            setTimeout(() => reject(new Error('timeout')), timeoutMs)
          ),
        ]).catch((err) => {
          if (err?.message === 'timeout') return { error: 'Rejestracja trwa zbyt długo. Odśwież stronę, odczekaj chwilę i spróbuj ponownie.' };
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
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-accent" />
          <p className="mt-4 text-ink-soft">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <RedirectIfNoTypySzkol>
        <div className="min-h-screen flex items-center justify-center bg-bg">
          <div className="text-center">
            <h1 className="font-display text-5xl font-bold text-ink mb-4 tracking-tight">EduGrid</h1>
            <p className="text-xl text-ink-soft mb-2">System planowania siatki godzin</p>
            <p className="text-sm text-ink-faint mb-6">Zalogowano: {[user.imie, user.nazwisko].filter(Boolean).join(' ') || user.email}</p>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              <Link
                href="/dashboard"
                className="inline-block px-6 py-3 bg-accent text-white rounded-sm hover:bg-accent-strong transition-colors font-medium"
              >
                Przejdź do Dashboard
              </Link>
              <Link
                href="/panel-admin"
                className="inline-block px-6 py-3 bg-ink text-white rounded-sm hover:bg-navy transition-colors font-medium"
              >
                Panel Administracyjny
              </Link>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="text-sm text-ink-faint hover:text-ink-soft underline"
            >
              Wyloguj
            </button>
          </div>
        </div>
      </RedirectIfNoTypySzkol>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md bg-surface rounded-card shadow-card border border-line overflow-hidden">
        <div className="px-6 py-5 border-b border-line">
          <h1 className="font-display text-2xl font-bold text-ink tracking-tight">EduGrid</h1>
          <p className="text-sm text-ink-soft mt-1">System planowania siatki godzin</p>
        </div>
        <div className="flex border-b border-line">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(''); }}
            className={`flex-1 py-3 text-sm font-medium ${tab === 'login' ? 'text-accent border-b-2 border-accent' : 'text-ink-faint hover:text-ink-soft'}`}
          >
            Logowanie
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(''); }}
            className={`flex-1 py-3 text-sm font-medium ${tab === 'register' ? 'text-accent border-b-2 border-accent' : 'text-ink-faint hover:text-ink-soft'}`}
          >
            Zakładanie konta
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-sm bg-danger-bg text-danger text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink-soft mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-line-strong rounded-sm focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink-soft mb-1">
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
              className="w-full px-3 py-2 border border-line-strong rounded-sm focus:ring-2 focus:ring-accent focus:border-accent"
            />
            {tab === 'register' && (
              <p className="mt-1 text-xs text-ink-faint">Minimum 8 znaków</p>
            )}
            {tab === 'login' && (
              <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded-sm border-line-strong text-accent focus:ring-accent"
                />
                <span className="text-sm text-ink-soft">Zapamiętaj mnie na tym urządzeniu</span>
              </label>
            )}
          </div>
          {tab === 'register' && (
            <>
              <div>
                <label htmlFor="imie" className="block text-sm font-medium text-ink-soft mb-1">
                  Imię
                </label>
                <input
                  id="imie"
                  type="text"
                  value={imie}
                  onChange={(e) => setImie(e.target.value)}
                  required={tab === 'register'}
                  autoComplete="given-name"
                  className="w-full px-3 py-2 border border-line-strong rounded-sm focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </div>
              <div>
                <label htmlFor="nazwisko" className="block text-sm font-medium text-ink-soft mb-1">
                  Nazwisko
                </label>
                <input
                  id="nazwisko"
                  type="text"
                  value={nazwisko}
                  onChange={(e) => setNazwisko(e.target.value)}
                  required={tab === 'register'}
                  autoComplete="family-name"
                  className="w-full px-3 py-2 border border-line-strong rounded-sm focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </div>
            </>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-accent text-white rounded-sm hover:bg-accent-strong disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {submitting ? 'Proszę czekać...' : tab === 'login' ? 'Zaloguj się' : 'Załóż konto'}
          </button>
        </form>
      </div>
    </div>
  );
}
