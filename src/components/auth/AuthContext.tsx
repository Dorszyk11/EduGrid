'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/** Bez „Zapamiętaj mnie”: w tej karcie po zalogowaniu; inna karta może „podłączyć się” przez BroadcastChannel. */
const EPHEMERAL_TAB_KEY = 'edugrid_auth_ephemeral_tab';
const AUTH_BC = 'edugrid-auth';
const MSG_PING = 'edugrid-ping';
const MSG_PONG = 'edugrid-pong';

function pingSiblingTabForEphemeralAuth(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    const pingId = crypto.randomUUID();
    const bc = new BroadcastChannel(AUTH_BC);
    const finish = (ok: boolean) => {
      clearTimeout(t);
      bc.close();
      resolve(ok);
    };
    const t = setTimeout(() => finish(false), 300);
    bc.onmessage = (ev: MessageEvent) => {
      const d = ev.data;
      if (d?.type === MSG_PONG && d.pingId === pingId) finish(true);
    };
    bc.postMessage({ type: MSG_PING, pingId });
  });
}

export interface AuthUser {
  id: string | number;
  email: string;
  imie?: string;
  nazwisko?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ error?: string }>;
  register: (email: string, password: string, imie: string, nazwisko: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel(AUTH_BC);
    bc.onmessage = (ev: MessageEvent) => {
      const d = ev.data;
      if (d?.type === MSG_PING && sessionStorage.getItem(EPHEMERAL_TAB_KEY) === '1') {
        bc.postMessage({ type: MSG_PONG, pingId: d.pingId });
      }
    };
    return () => bc.close();
  }, []);

  const refresh = useCallback(async () => {
    const timeoutMs = 5000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include', signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      const u = (data.user ?? null) as AuthUser | null;
      if (!u) {
        setUser(null);
        return;
      }
      const rememberMe = data.rememberMe !== false;
      if (rememberMe) {
        setUser(u);
        return;
      }
      let tabOk = sessionStorage.getItem(EPHEMERAL_TAB_KEY) === '1';
      if (!tabOk) {
        tabOk = await pingSiblingTabForEphemeralAuth();
        if (tabOk) sessionStorage.setItem(EPHEMERAL_TAB_KEY, '1');
      }
      if (!tabOk) {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        setUser(null);
        return;
      }
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    const timeoutMs = 25_000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, rememberMe }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Logowanie nie powiodło się.' };
      if (rememberMe) {
        sessionStorage.removeItem(EPHEMERAL_TAB_KEY);
      } else {
        sessionStorage.setItem(EPHEMERAL_TAB_KEY, '1');
      }
      setUser(data.user ?? null);
      return {};
    } catch (e) {
      clearTimeout(timeoutId);
      if (e instanceof Error && e.name === 'AbortError') {
        return { error: 'Logowanie trwa zbyt długo. Odśwież stronę i spróbuj ponownie.' };
      }
      return { error: 'Połączenie nie powiodło się. Sprawdź sieć i spróbuj ponownie.' };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, imie: string, nazwisko: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, imie, nazwisko }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { error: (data && data.error) || `Błąd ${res.status}. Spróbuj ponownie.` };
      return {};
    } catch (e) {
      return { error: 'Połączenie nie powiodło się. Sprawdź sieć i spróbuj ponownie.' };
    }
  }, []);

  const logout = useCallback(async () => {
    sessionStorage.removeItem(EPHEMERAL_TAB_KEY);
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
