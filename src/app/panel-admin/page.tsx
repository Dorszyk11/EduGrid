'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TypSzkoly {
  id: string | number;
  nazwa: string;
  liczba_lat?: number;
  kod_mein?: string;
}

interface Przedmiot {
  id: string | number;
  nazwa: string;
  kod_mein?: string;
  typ_zajec: string;
  poziom: string;
  aktywny?: boolean;
}

interface KlasaAdmin {
  id: string | number;
  nazwa: string;
  rok_szkolny: string;
  profil: string | null;
  typ_szkoly: { id: string; nazwa?: string } | null;
  /** true = tylko to konto może edytować/usunąć klasę */
  can_manage?: boolean;
}

const TYP_ZAJEC_OPTS = [
  { value: 'ogolnoksztalcace', label: 'Ogólnokształcące' },
  { value: 'zawodowe_teoretyczne', label: 'Zawodowe teoretyczne' },
  { value: 'zawodowe_praktyczne', label: 'Zawodowe praktyczne' },
];

const POZIOM_OPTS = [
  { value: 'podstawowy', label: 'Podstawowy' },
  { value: 'rozszerzony', label: 'Rozszerzony' },
  { value: 'brak', label: 'Brak podziału' },
];

const LITERY_KLAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/** Opcje roku początku cyklu (np. 2022 dla technikum 2022–2027) */
function opcjeRokuPoczatku(): number[] {
  const now = new Date().getFullYear();
  const opcje: number[] = [];
  for (let y = now - 5; y <= now + 5; y++) {
    opcje.push(y);
  }
  return opcje;
}

export default function PanelAdminaPage() {
  const [szkoly, setSzkoly] = useState<TypSzkoly[]>([]);
  const [przedmioty, setPrzedmioty] = useState<Przedmiot[]>([]);
  const [klasy, setKlasy] = useState<KlasaAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [formSzkola, setFormSzkola] = useState({ nazwa: '', liczba_lat: '', kod_mein: '' });
  const [formPrzedmiot, setFormPrzedmiot] = useState({
    nazwa: '',
    kod_mein: '',
    typ_zajec: 'ogolnoksztalcace',
    poziom: 'podstawowy',
  });
  const [formKlasa, setFormKlasa] = useState({
    typSzkolyId: '',
    litera: 'A',
    rokPoczatku: '',
    profil: '',
  });
  const [submittingSzkola, setSubmittingSzkola] = useState(false);
  const [submittingPrzedmiot, setSubmittingPrzedmiot] = useState(false);
  const [submittingKlasa, setSubmittingKlasa] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingPrzedmiotId, setDeletingPrzedmiotId] = useState<string | null>(null);
  const [deletingKlasaId, setDeletingKlasaId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [rSzk, rPrz, rKlasy] = await Promise.all([
        fetch('/api/typy-szkol', { cache: 'no-store' }),
        fetch('/api/przedmioty', { cache: 'no-store' }),
        fetch('/api/klasy', { cache: 'no-store', credentials: 'include' }),
      ]);
      const szk = await rSzk.json();
      const prz = await rPrz.json();
      const kl = await rKlasy.json();
      setSzkoly(Array.isArray(szk) ? szk : []);
      setPrzedmioty(Array.isArray(prz) ? prz : []);
      setKlasy(kl.klasy ?? []);
    } catch {
      setSzkoly([]);
      setPrzedmioty([]);
      setKlasy([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleAddSzkola = async (e: React.FormEvent) => {
    e.preventDefault();
    const { nazwa, liczba_lat, kod_mein } = formSzkola;
    if (!nazwa.trim() || !liczba_lat.trim() || !kod_mein.trim()) {
      setMsg({ type: 'err', text: 'Wypełnij nazwę, liczbę lat i kod MEiN.' });
      return;
    }
    const lat = Number(liczba_lat);
    if (Number.isNaN(lat) || lat < 1 || lat > 8) {
      setMsg({ type: 'err', text: 'Liczba lat: 1–8.' });
      return;
    }
    setSubmittingSzkola(true);
    setMsg(null);
    try {
      const res = await fetch('/api/typy-szkol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nazwa: nazwa.trim(),
          liczba_lat: lat,
          kod_mein: kod_mein.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMsg({ type: 'ok', text: 'Typ szkoły został dodany pomyślnie.' });
      setFormSzkola({ nazwa: '', liczba_lat: '', kod_mein: '' });
      fetchAll();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Błąd dodawania.' });
    } finally {
      setSubmittingSzkola(false);
    }
  };

  const handleDeleteSzkola = async (s: TypSzkoly) => {
    if (!confirm(`Usunąć typ szkoły „${s.nazwa}”?`)) return;
    const id = String(s.id);
    setDeletingId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/typy-szkol/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMsg({ type: 'ok', text: 'Typ szkoły usunięty.' });
      fetchAll();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Błąd usuwania.' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddPrzedmiot = async (e: React.FormEvent) => {
    e.preventDefault();
    const { nazwa, kod_mein, typ_zajec, poziom } = formPrzedmiot;
    if (!nazwa.trim()) {
      setMsg({ type: 'err', text: 'Wypełnij nazwę przedmiotu.' });
      return;
    }
    setSubmittingPrzedmiot(true);
    setMsg(null);
    try {
      const res = await fetch('/api/przedmioty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nazwa: nazwa.trim(),
          kod_mein: kod_mein.trim() || undefined,
          typ_zajec,
          poziom,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMsg({ type: 'ok', text: 'Przedmiot dodany.' });
      setFormPrzedmiot({ nazwa: '', kod_mein: '', typ_zajec: 'ogolnoksztalcace', poziom: 'podstawowy' });
      fetchAll();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Błąd dodawania.' });
    } finally {
      setSubmittingPrzedmiot(false);
    }
  };

  const handleDeletePrzedmiot = async (p: Przedmiot) => {
    if (!confirm(`Usunąć przedmiot „${p.nazwa}”?`)) return;
    const id = String(p.id);
    setDeletingPrzedmiotId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/przedmioty/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMsg({ type: 'ok', text: 'Przedmiot usunięty.' });
      fetchAll();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Błąd usuwania.' });
    } finally {
      setDeletingPrzedmiotId(null);
    }
  };

  const selectedTypSzkoly = szkoly.find((s) => String(s.id) === formKlasa.typSzkolyId);
  const liczbaLat = selectedTypSzkoly?.liczba_lat ?? 0;
  const rokPoczatkuNum = formKlasa.rokPoczatku ? Number(formKlasa.rokPoczatku) : NaN;
  const rokKonca = !Number.isNaN(rokPoczatkuNum) && liczbaLat > 0 ? rokPoczatkuNum + liczbaLat : null;

  const handleAddKlasa = async (e: React.FormEvent) => {
    e.preventDefault();
    const { typSzkolyId, litera, rokPoczatku } = formKlasa;
    if (!typSzkolyId || !rokPoczatku.trim() || !litera) {
      setMsg({ type: 'err', text: 'Wybierz typ szkoły, rok początku i literę klasy.' });
      return;
    }
    const start = Number(rokPoczatku);
    if (Number.isNaN(start) || start < 2000 || start > 2040) {
      setMsg({ type: 'err', text: 'Rok początku: 2000–2040.' });
      return;
    }
    setSubmittingKlasa(true);
    setMsg(null);
    try {
      const res = await fetch('/api/klasy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          typ_szkoly_id: typSzkolyId,
          rok_poczatku: start,
          litera: litera.trim(),
          profil: formKlasa.profil.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMsg({
        type: 'ok',
        text: `Klasa została dodana pomyślnie. (${data.nazwa ?? litera}, zakres: ${data.rok_szkolny ?? ''})`,
      });
      setFormKlasa((prev) => ({
        ...prev,
        litera: 'A',
        profil: '',
      }));
      fetchAll();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Błąd dodawania klasy.' });
    } finally {
      setSubmittingKlasa(false);
    }
  };

  const handleDeleteKlasa = async (k: KlasaAdmin) => {
    if (!confirm(`Usunąć klasę „${k.nazwa}” (${k.rok_szkolny})?`)) return;
    const id = String(k.id);
    setDeletingKlasaId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/klasy/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMsg({ type: 'ok', text: 'Klasa została usunięta.' });
      fetchAll();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Błąd usuwania klasy.' });
    } finally {
      setDeletingKlasaId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Panel admina</h1>

      {msg && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg ${
            msg.type === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {msg.text}
          {msg.type === 'ok' && msg.text.includes('Klasa') && (
            <span className="block mt-2">
              <Link href="/klasy" className="text-green-700 underline font-medium">
                Przejdź do listy klas →
              </Link>
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-500">Ładowanie…</div>
      ) : (
        <div className="space-y-12">
          {/* Szkoły – ukryte (display: none) */}
          <section className="hidden bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Typy szkół</h2>
              <p className="text-sm text-gray-600 mt-0.5">Dodaj nowy typ szkoły (nazwa, liczba lat, kod MEiN).</p>
            </div>
            <div className="p-5 space-y-5">
              <div className="hidden">
                <form onSubmit={handleAddSzkola} className="flex flex-wrap gap-3 items-end">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">Nazwa</span>
                    <input
                      type="text"
                      value={formSzkola.nazwa}
                      onChange={(e) => setFormSzkola((s) => ({ ...s, nazwa: e.target.value }))}
                      placeholder="np. Liceum ogólnokształcące"
                      className="rounded-lg border border-gray-300 px-3 py-2 w-64"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">Liczba lat</span>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={formSzkola.liczba_lat}
                      onChange={(e) => setFormSzkola((s) => ({ ...s, liczba_lat: e.target.value }))}
                      placeholder="4"
                      className="rounded-lg border border-gray-300 px-3 py-2 w-24"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">Kod MEiN</span>
                    <input
                      type="text"
                      value={formSzkola.kod_mein}
                      onChange={(e) => setFormSzkola((s) => ({ ...s, kod_mein: e.target.value }))}
                      placeholder="LO"
                      className="rounded-lg border border-gray-300 px-3 py-2 w-28"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={submittingSzkola}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                  >
                    {submittingSzkola ? 'Dodawanie…' : 'Dodaj szkołę'}
                  </button>
                </form>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      <th className="px-4 py-2 text-sm font-medium text-gray-600">Nazwa</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-600">Kod MEiN</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-600">Lata</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-600 text-right w-24">Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {szkoly.map((s) => (
                      <tr key={String(s.id)} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                        <td className="px-4 py-2 font-medium text-gray-900">{s.nazwa}</td>
                        <td className="px-4 py-2 text-gray-600">{s.kod_mein ?? '–'}</td>
                        <td className="px-4 py-2 text-gray-600">{s.liczba_lat ?? '–'}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteSzkola(s)}
                            disabled={deletingId === String(s.id)}
                            className="text-sm text-red-600 hover:bg-red-50 px-2 py-1 rounded disabled:opacity-50"
                          >
                            {deletingId === String(s.id) ? '…' : 'Usuń'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {szkoly.length === 0 && (
                  <p className="py-6 text-center text-gray-500 text-sm">Brak typów szkół. Dodaj pierwszy powyżej.</p>
                )}
              </div>
            </div>
          </section>

          {/* Klasy */}
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Dodawanie klas</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Jedna klasa = jeden cykl (np. technikum 5 lat → rok początku 2022, rok końca 2027). Wybierz typ szkoły – na tej podstawie obliczy się koniec cyklu (początek + liczba lat).
              </p>
            </div>
            <div className="p-5 space-y-5">
              <form onSubmit={handleAddKlasa} className="flex flex-wrap gap-4 items-end">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-700">Rodzaj szkoły (typ)</span>
                  <select
                    value={formKlasa.typSzkolyId}
                    onChange={(e) => setFormKlasa((prev) => ({ ...prev, typSzkolyId: e.target.value }))}
                    className="rounded-lg border border-gray-300 px-3 py-2 w-64"
                  >
                    <option value="">— wybierz typ szkoły —</option>
                    {szkoly.map((s) => (
                      <option key={String(s.id)} value={String(s.id)}>
                        {s.nazwa} ({s.liczba_lat} lat)
                      </option>
                    ))}
                  </select>
                </label>
                {liczbaLat > 0 && (
                  <>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-gray-700">Rok początku cyklu</span>
                      <select
                        value={formKlasa.rokPoczatku}
                        onChange={(e) => setFormKlasa((s) => ({ ...s, rokPoczatku: e.target.value }))}
                        className="rounded-lg border border-gray-300 px-3 py-2 w-24"
                      >
                        <option value="">—</option>
                        {opcjeRokuPoczatku().map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </label>
                    {rokKonca != null && (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-500">Rok końca cyklu</span>
                        <span className="text-sm font-semibold text-gray-700">{rokKonca}</span>
                        <span className="text-xs text-gray-500">(zakres: {formKlasa.rokPoczatku}–{rokKonca})</span>
                      </div>
                    )}
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-gray-700">Litera (np. A, B, C)</span>
                      <select
                        value={formKlasa.litera}
                        onChange={(e) => setFormKlasa((s) => ({ ...s, litera: e.target.value }))}
                        className="rounded-lg border border-gray-300 px-3 py-2 w-20"
                      >
                        {LITERY_KLAS.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-gray-700">Profil (opcjonalnie)</span>
                      <input
                        type="text"
                        value={formKlasa.profil}
                        onChange={(e) => setFormKlasa((s) => ({ ...s, profil: e.target.value }))}
                        placeholder="np. matematyczno-fizyczny"
                        className="rounded-lg border border-gray-300 px-3 py-2 w-48"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={submittingKlasa || !formKlasa.rokPoczatku}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                    >
                      {submittingKlasa ? 'Dodawanie…' : 'Dodaj klasę'}
                    </button>
                  </>
                )}
              </form>
              {formKlasa.typSzkolyId && liczbaLat === 0 && (
                <p className="text-sm text-amber-600">Wybrany typ szkoły nie ma ustawionej liczby lat – ustaw ją w sekcji Typy szkół.</p>
              )}
              <div className="overflow-x-auto mt-6">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      <th className="px-4 py-2 text-sm font-medium text-gray-600">Nazwa</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-600">Typ szkoły</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-600">Rok szkolny (zakres)</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-600">Profil</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-600 text-right w-24">Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {klasy.map((k) => (
                      <tr key={String(k.id)} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                        <td className="px-4 py-2 font-medium text-gray-900">{k.nazwa}</td>
                        <td className="px-4 py-2 text-gray-600">{k.typ_szkoly?.nazwa ?? '–'}</td>
                        <td className="px-4 py-2 text-gray-600">{k.rok_szkolny}</td>
                        <td className="px-4 py-2 text-gray-600">{k.profil ?? '–'}</td>
                        <td className="px-4 py-2 text-right">
                          {k.can_manage !== false ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteKlasa(k)}
                              disabled={deletingKlasaId === String(k.id)}
                              className="text-sm text-red-600 hover:bg-red-50 px-2 py-1 rounded disabled:opacity-50"
                            >
                              {deletingKlasaId === String(k.id) ? '…' : 'Usuń'}
                            </button>
                          ) : (
                            <span className="text-sm text-gray-400" title="Tylko konto twórcy może usunąć tę klasę">–</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {klasy.length === 0 && (
                  <p className="py-6 text-center text-gray-500 text-sm">Brak klas. Dodaj pierwszą powyżej.</p>
                )}
              </div>
            </div>
          </section>

          {/* Przedmioty – ukryte (display: none) */}
          <section className="hidden bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Przedmioty</h2>
              <p className="text-sm text-gray-600 mt-0.5">Dodaj nowy przedmiot (nazwa, typ zajęć, poziom).</p>
            </div>
            <div className="p-5 space-y-5">
              <div className="hidden">
                <form onSubmit={handleAddPrzedmiot} className="flex flex-wrap gap-3 items-end">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">Nazwa</span>
                    <input
                      type="text"
                      value={formPrzedmiot.nazwa}
                      onChange={(e) => setFormPrzedmiot((s) => ({ ...s, nazwa: e.target.value }))}
                      placeholder="np. Język polski"
                      className="rounded-lg border border-gray-300 px-3 py-2 w-56"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">Kod MEiN</span>
                    <input
                      type="text"
                      value={formPrzedmiot.kod_mein}
                      onChange={(e) => setFormPrzedmiot((s) => ({ ...s, kod_mein: e.target.value }))}
                      placeholder="JP (opcjonalnie)"
                      className="rounded-lg border border-gray-300 px-3 py-2 w-28"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">Typ zajęć</span>
                    <select
                      value={formPrzedmiot.typ_zajec}
                      onChange={(e) => setFormPrzedmiot((s) => ({ ...s, typ_zajec: e.target.value }))}
                      className="rounded-lg border border-gray-300 px-3 py-2 w-44"
                    >
                      {TYP_ZAJEC_OPTS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">Poziom</span>
                    <select
                      value={formPrzedmiot.poziom}
                      onChange={(e) => setFormPrzedmiot((s) => ({ ...s, poziom: e.target.value }))}
                      className="rounded-lg border border-gray-300 px-3 py-2 w-36"
                    >
                      {POZIOM_OPTS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    disabled={submittingPrzedmiot}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                  >
                    {submittingPrzedmiot ? 'Dodawanie…' : 'Dodaj przedmiot'}
                  </button>
                </form>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      <th className="px-4 py-2 text-sm font-medium text-gray-600">Nazwa</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-600">Kod MEiN</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-600">Typ</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-600">Poziom</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-600 text-right w-24">Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {przedmioty.map((p) => (
                      <tr key={String(p.id)} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                        <td className="px-4 py-2 font-medium text-gray-900">{p.nazwa}</td>
                        <td className="px-4 py-2 text-gray-600">{p.kod_mein ?? '–'}</td>
                        <td className="px-4 py-2 text-gray-600">
                          {TYP_ZAJEC_OPTS.find((o) => o.value === p.typ_zajec)?.label ?? p.typ_zajec}
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {POZIOM_OPTS.find((o) => o.value === p.poziom)?.label ?? p.poziom}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeletePrzedmiot(p)}
                            disabled={deletingPrzedmiotId === String(p.id)}
                            className="text-sm text-red-600 hover:bg-red-50 px-2 py-1 rounded disabled:opacity-50"
                          >
                            {deletingPrzedmiotId === String(p.id) ? '…' : 'Usuń'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {przedmioty.length === 0 && (
                  <p className="py-6 text-center text-gray-500 text-sm">Brak przedmiotów. Dodaj pierwszy powyżej.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
