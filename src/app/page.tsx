'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import RedirectIfNoTypySzkol from '@/components/layout/RedirectIfNoTypySzkol';
import { useAuth } from '@/components/auth/AuthContext';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import Button, { buttonClass } from '@/components/ui/Button';

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
        <div className="text-center" role="status">
          <div className="mx-auto h-12 w-12 animate-spin motion-reduce:animate-none rounded-full border-b-2 border-accent" />
          <p className="mt-4 text-ink-soft">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <RedirectIfNoTypySzkol>
        <div className="min-h-screen flex items-center justify-center bg-bg p-4">
          <div className="w-full max-w-md bg-surface rounded-card shadow-card border border-line p-6 text-center">
            <h1 className="font-display text-2xl font-bold text-ink tracking-tight">EduGrid</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Zalogowano: {[user.imie, user.nazwisko].filter(Boolean).join(' ') || user.email}
            </p>
            <Link href="/dashboard" className={`mt-5 ${buttonClass('primary')}`}>
              Przejdź do panelu
            </Link>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => logout()}
                className="text-sm text-ink-faint hover:text-ink-soft underline"
              >
                Wyloguj
              </button>
            </div>
          </div>
        </div>
      </RedirectIfNoTypySzkol>
    );
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Panel marki — granatowa powłoka z „ledgerową” siatką (sygnatura produktu). Tylko desktop. */}
      <aside className="relative hidden overflow-hidden bg-navy text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              'linear-gradient(var(--navy-line) 1px, transparent 1px), linear-gradient(90deg, var(--navy-line) 1px, transparent 1px)',
            backgroundSize: '46px 46px',
            maskImage: 'radial-gradient(125% 95% at 12% 0%, #000 30%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(125% 95% at 12% 0%, #000 30%, transparent 100%)',
          }}
        />
        <div className="relative">
          <span className="font-display text-2xl font-bold tracking-tight">EduGrid</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            Siatka godzin zgodna z ramowym planem nauczania.
          </h2>
          <ul className="mt-8 space-y-3.5">
            {[
              'Przydzielaj godziny do wyboru, dyrektorskie i rozszerzenia.',
              'Na bieżąco sprawdzaj zgodność z ramowym planem MEiN.',
              'Analizuj realizację i zapotrzebowanie kadrowe.',
            ].map((linia) => (
              <li key={linia} className="flex items-start gap-3 text-slate-300">
                <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-[1px] bg-accent" />
                <span className="text-sm leading-relaxed">{linia}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-400">
          Zgodnie z Dz.U. 2025 poz. 363 — ramowe plany nauczania.
        </p>
      </aside>

      {/* Kolumna logowania */}
      <main className="flex min-h-screen items-center justify-center bg-bg p-4 sm:p-6">
        <div className="w-full max-w-md">
          {/* Nagłówek marki na mobile (panel granatowy ukryty) */}
          <div className="mb-6 text-center lg:hidden">
            <span className="font-display text-2xl font-bold tracking-tight text-ink">EduGrid</span>
            <p className="mt-1 text-sm text-ink-soft">System planowania siatki godzin</p>
          </div>

          <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
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
                <div role="alert" className="p-3 rounded-sm bg-danger-bg text-danger text-sm">
                  {error}
                </div>
              )}
              <Field label="Email" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  invalid={!!error}
                />
              </Field>
              <div>
                <Field label="Hasło" htmlFor="password" hint={tab === 'register' ? 'Minimum 8 znaków' : undefined}>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                    minLength={tab === 'register' ? 8 : undefined}
                    invalid={!!error}
                  />
                </Field>
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
                  <Field label="Imię" htmlFor="imie">
                    <Input
                      id="imie"
                      type="text"
                      value={imie}
                      onChange={(e) => setImie(e.target.value)}
                      required={tab === 'register'}
                      autoComplete="given-name"
                      invalid={!!error}
                    />
                  </Field>
                  <Field label="Nazwisko" htmlFor="nazwisko">
                    <Input
                      id="nazwisko"
                      type="text"
                      value={nazwisko}
                      onChange={(e) => setNazwisko(e.target.value)}
                      required={tab === 'register'}
                      autoComplete="family-name"
                      invalid={!!error}
                    />
                  </Field>
                </>
              )}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Proszę czekać...' : tab === 'login' ? 'Zaloguj się' : 'Załóż konto'}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
