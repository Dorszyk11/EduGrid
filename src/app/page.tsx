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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="mt-4 text-gray-600">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <RedirectIfNoTypySzkol>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">EduGrid</h1>
            <p className="text-xl text-gray-600 mb-2">System planowania siatki godzin</p>
            <p className="text-sm text-gray-500 mb-6">Zalogowano: {[user.imie, user.nazwisko].filter(Boolean).join(' ') || user.email}</p>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              <Link
                href="/dashboard"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Przejdź do Dashboard
              </Link>
              <Link
                href="/panel-admin"
                className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Panel Administracyjny
              </Link>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Wyloguj
            </button>
          </div>
        </div>
      </RedirectIfNoTypySzkol>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">EduGrid</h1>
          <p className="text-sm text-gray-600 mt-1">System planowania siatki godzin</p>
        </div>
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(''); }}
            className={`flex-1 py-3 text-sm font-medium ${tab === 'login' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Logowanie
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(''); }}
            className={`flex-1 py-3 text-sm font-medium ${tab === 'register' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Zakładanie konta
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {tab === 'register' && (
              <p className="mt-1 text-xs text-gray-500">Minimum 8 znaków</p>
            )}
            {tab === 'login' && (
              <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Zapamiętaj mnie na tym urządzeniu</span>
              </label>
            )}
          </div>
          {tab === 'register' && (
            <>
              <div>
                <label htmlFor="imie" className="block text-sm font-medium text-gray-700 mb-1">
                  Imię
                </label>
                <input
                  id="imie"
                  type="text"
                  value={imie}
                  onChange={(e) => setImie(e.target.value)}
                  required={tab === 'register'}
                  autoComplete="given-name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="nazwisko" className="block text-sm font-medium text-gray-700 mb-1">
                  Nazwisko
                </label>
                <input
                  id="nazwisko"
                  type="text"
                  value={nazwisko}
                  onChange={(e) => setNazwisko(e.target.value)}
                  required={tab === 'register'}
                  autoComplete="family-name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {submitting ? 'Proszę czekać...' : tab === 'login' ? 'Zaloguj się' : 'Załóż konto'}
          </button>
        </form>
      </div>
    </div>
  );
}
