import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import type { PoolClient } from 'pg';

/** 1 godzina tygodniowo ≈ 38 godzin rocznie (rok szkolny), po 19 na semestr */
const GODZINY_ROCZNE_ZA_1_TYG = 38;

function getConnectionString(): string | undefined {
  const uri = process.env.DATABASE_URI;
  if (!uri) return undefined;
  if (uri.includes('pooler.supabase.com') && uri.includes(':5432/')) {
    return uri.replace(':5432/', ':6543/');
  }
  return uri;
}

type TableInfo = {
  tableName: string;
  columns: string[];
  quote: (c: string) => string;
  quotedTable: string;
  klasaCol: string;
  przedmiotCol: string;
  nauczycielCol: string;
  rokSzkolnyCol: string;
  tygCol: string;
  roczneCol: string;
  s1Col: string;
  s2Col: string;
  idCol: string;
  hasRokCol: boolean;
  rokCol: string | null;
};

async function getRozkladTableInfo(client: PoolClient): Promise<TableInfo> {
  const tablesRes = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%godzin%'`
  );
  let tableName: string | null = null;
  let columns: string[] = [];
  for (const t of tablesRes.rows as { table_name: string }[]) {
    const colRes = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
      [t.table_name]
    );
    const cols = (colRes.rows as { column_name: string }[]).map((r) => r.column_name);
    const hasGodzinyTyg = cols.some((c) => c === 'godziny_tyg' || /^godziny_tyg$/i.test(c));
    const hasNauczyciel = cols.some((c) => c === 'nauczyciel_id' || c === 'nauczyciel');
    const hasRokSzkolny = cols.some((c) => /rok_szkolny/i.test(c));
    const hasSemestr = cols.some((c) => /semestr_1|semestr_2/i.test(c));
    if (hasGodzinyTyg && hasNauczyciel && hasRokSzkolny && hasSemestr) {
      tableName = t.table_name;
      columns = cols;
      break;
    }
  }
  if (!tableName || columns.length === 0) {
    throw new Error(
      'Nie znaleziono tabeli rozkład-godzin (wymagane kolumny: godziny_tyg, nauczyciel/nauczyciel_id, rok_szkolny, semestr_1/2).'
    );
  }
  const hasIdSuffix = columns.some((c) => c === 'klasa_id' || c === 'przedmiot_id' || c === 'nauczyciel_id');
  const klasaCol = hasIdSuffix ? 'klasa_id' : 'klasa';
  const przedmiotCol = hasIdSuffix ? 'przedmiot_id' : 'przedmiot';
  const nauczycielCol = hasIdSuffix ? 'nauczyciel_id' : 'nauczyciel';
  const q = (col: string) => (columns.includes(col) ? col : null);
  const idCol = q('id') ?? columns.find((c) => c === 'id')!;
  const tygCol = q('godziny_tyg') ?? columns.find((c) => /godziny.*tyg|tyg/i.test(c))!;
  const roczneCol = q('godziny_roczne') ?? columns.find((c) => /godziny.*roczne|roczne/i.test(c))!;
  const s1Col = q('semestr_1') ?? columns.find((c) => /semestr.*1|s1/i.test(c))!;
  const s2Col = q('semestr_2') ?? columns.find((c) => /semestr.*2|s2/i.test(c))!;
  const rokSzkolnyCol = q('rok_szkolny') ?? columns.find((c) => /rok.*szkolny/i.test(c))!;
  const rokCol = columns.find((c) => c === 'rok') ?? null;
  const quote = (c: string) => `"${c.replace(/"/g, '""')}"`;
  const quotedTable = `"${tableName.replace(/"/g, '""')}"`;
  if (!idCol || !tygCol || !roczneCol || !s1Col || !s2Col || !rokSzkolnyCol) {
    throw new Error(`Brak wymaganych kolumn. Dostępne: ${columns.join(', ')}`);
  }
  return {
    tableName,
    columns,
    quote,
    quotedTable,
    klasaCol,
    przedmiotCol,
    nauczycielCol,
    rokSzkolnyCol,
    tygCol,
    roczneCol,
    s1Col,
    s2Col,
    idCol,
    hasRokCol: Boolean(rokCol),
    rokCol,
  };
}

/** Zwraca sumę przypisanych godzin per (przedmiot_id, rok) dla danej klasy i roku szkolnego. */
async function getPrzypisaneGodziny(
  client: PoolClient,
  klasaId: string | number,
  rokSzkolny: string
): Promise<Record<string, Record<string, number>>> {
  const info = await getRozkladTableInfo(client);
  const out: Record<string, Record<string, number>> = {};
  if (info.hasRokCol && info.rokCol) {
    const res = await client.query(
      `SELECT ${info.quote(info.przedmiotCol)} AS przedmiot_id, ${info.quote(info.rokCol)} AS rok, SUM(${info.quote(info.tygCol)}) AS suma FROM ${info.quotedTable} WHERE ${info.quote(info.klasaCol)} = $1 AND ${info.quote(info.rokSzkolnyCol)} = $2 GROUP BY ${info.quote(info.przedmiotCol)}, ${info.quote(info.rokCol)}`,
      [klasaId, rokSzkolny]
    );
    for (const r of res.rows as { przedmiot_id: string | number; rok: string | null; suma: string }[]) {
      const pid = String(r.przedmiot_id);
      const rok = r.rok ?? '';
      if (!out[pid]) out[pid] = {};
      out[pid][rok] = (out[pid][rok] ?? 0) + Number(r.suma);
    }
  } else {
    const res = await client.query(
      `SELECT ${info.quote(info.przedmiotCol)} AS przedmiot_id, SUM(${info.quote(info.tygCol)}) AS suma FROM ${info.quotedTable} WHERE ${info.quote(info.klasaCol)} = $1 AND ${info.quote(info.rokSzkolnyCol)} = $2 GROUP BY ${info.quote(info.przedmiotCol)}`,
      [klasaId, rokSzkolny]
    );
    for (const r of res.rows as { przedmiot_id: string | number; suma: string }[]) {
      const pid = String(r.przedmiot_id);
      out[pid] = { '': Number(r.suma) };
    }
  }
  return out;
}

/** Zapis bezpośrednio do Postgres (omija Payload). */
async function zapiszDoPostgres(params: {
  klasaId: string | number;
  przedmiotId: string | number;
  nauczycielId: string | number;
  rokSzkolny: string;
  godzinyTyg: number;
  rok?: string;
}): Promise<{ ok: boolean; updated?: boolean; created?: boolean; message: string }> {
  const conn = getConnectionString();
  if (!conn) throw new Error('Brak DATABASE_URI');

  const pool = new Pool({
    connectionString: conn,
    ...(conn.includes('supabase') && { ssl: { rejectUnauthorized: false } }),
  });

  const client = await pool.connect();
  try {
    const { klasaId, przedmiotId, nauczycielId, rokSzkolny, godzinyTyg, rok } = params;
    const godzinyRoczne = Math.round(godzinyTyg * GODZINY_ROCZNE_ZA_1_TYG);
    const semestr1 = Math.floor(godzinyRoczne / 2);
    const semestr2 = godzinyRoczne - semestr1;

    const info = await getRozkladTableInfo(client);

    const whereRok = info.hasRokCol && info.rokCol && rok != null && rok !== ''
      ? ` AND ${info.quote(info.rokCol)} = $5`
      : info.hasRokCol && info.rokCol
        ? ` AND (${info.quote(info.rokCol)} IS NULL OR ${info.quote(info.rokCol)} = $5)`
        : '';
    const existingParams: (string | number)[] = [klasaId, przedmiotId, nauczycielId, rokSzkolny];
    if (info.hasRokCol && info.rokCol) existingParams.push(rok ?? '');

    const existing = await client.query(
      `SELECT ${info.quote(info.idCol)}, ${info.quote(info.tygCol)}, ${info.quote(info.roczneCol)}, ${info.quote(info.s1Col)}, ${info.quote(info.s2Col)} FROM ${info.quotedTable} WHERE ${info.quote(info.klasaCol)} = $1 AND ${info.quote(info.przedmiotCol)} = $2 AND ${info.quote(info.nauczycielCol)} = $3 AND ${info.quote(info.rokSzkolnyCol)} = $4${whereRok} LIMIT 1`,
      existingParams
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0] as Record<string, number>;
      const curTyg = Number(row[info.tygCol]) || 0;
      const curRoczne = Number(row[info.roczneCol]) || 0;
      const curS1 = Number(row[info.s1Col]) || 0;
      const curS2 = Number(row[info.s2Col]) || 0;
      const newTyg = curTyg + godzinyTyg;
      const newRoczne = curRoczne + godzinyRoczne;
      const newS1 = curS1 + semestr1;
      const newS2 = curS2 + semestr2;
      if (newTyg > 10) throw new Error('Maksymalnie 10 godzin tygodniowo na jedno przypisanie.');

      const updAtCol = info.columns.find((c) => c === 'updated_at');
      const setClause = updAtCol
        ? `SET ${info.quote(info.tygCol)} = $1, ${info.quote(info.roczneCol)} = $2, ${info.quote(info.s1Col)} = $3, ${info.quote(info.s2Col)} = $4, ${info.quote(updAtCol)} = NOW()`
        : `SET ${info.quote(info.tygCol)} = $1, ${info.quote(info.roczneCol)} = $2, ${info.quote(info.s1Col)} = $3, ${info.quote(info.s2Col)} = $4`;
      await client.query(
        `UPDATE ${info.quotedTable} ${setClause} WHERE ${info.quote(info.idCol)} = $5`,
        [newTyg, newRoczne, newS1, newS2, row[info.idCol]]
      );
      return { ok: true, updated: true, message: 'Dodano godziny do istniejącego przydziału.' };
    }

    const hasCreatedAt = info.columns.includes('created_at');
    const hasUpdatedAt = info.columns.includes('updated_at');
    const insCols = [info.klasaCol, info.przedmiotCol, info.nauczycielCol, info.rokSzkolnyCol, info.tygCol, info.roczneCol, info.s1Col, info.s2Col];
    const values: (string | number)[] = [klasaId, przedmiotId, nauczycielId, rokSzkolny, godzinyTyg, godzinyRoczne, semestr1, semestr2];
    if (info.hasRokCol && info.rokCol) {
      insCols.push(info.rokCol);
      values.push(rok ?? '');
    }
    if (hasCreatedAt) {
      insCols.push('created_at');
      values.push(new Date().toISOString());
    }
    if (hasUpdatedAt) {
      insCols.push('updated_at');
      values.push(new Date().toISOString());
    }
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    await client.query(
      `INSERT INTO ${info.quotedTable} (${insCols.map((c) => info.quote(c)).join(', ')}) VALUES (${placeholders})`,
      values
    );
    return { ok: true, created: true, message: 'Przydział zapisany.' };
  } finally {
    client.release();
    await pool.end();
  }
}

/** Normalizacja ID (liczba lub string). */
function toId(v: unknown): string | number {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  const n = Number(s);
  if (Number.isFinite(n) && String(n) === s) return n;
  return s;
}

/**
 * GET /api/dyspozycja/przydziel?klasaId=xxx&rokSzkolny=YYYY/YYYY
 * Zwraca sumę już przypisanych godzin per (przedmiot_id, rok) – do wyliczenia „Do przydzielenia” w Dyspozycji.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const klasaId = searchParams.get('klasaId');
    const rokSzkolny = searchParams.get('rokSzkolny')?.trim().replace(/-/g, '/');
    if (!klasaId || !rokSzkolny || !/^\d{4}\/\d{4}$/.test(rokSzkolny)) {
      return NextResponse.json(
        { error: 'Wymagane: klasaId i rokSzkolny (YYYY/YYYY)' },
        { status: 400 }
      );
    }
    const conn = getConnectionString();
    if (!conn) return NextResponse.json({ error: 'Brak DATABASE_URI' }, { status: 500 });
    const pool = new Pool({
      connectionString: conn,
      ...(conn.includes('supabase') && { ssl: { rejectUnauthorized: false } }),
    });
    const client = await pool.connect();
    try {
      const assigned = await getPrzypisaneGodziny(client, toId(klasaId), rokSzkolny);
      return NextResponse.json({ assigned });
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    console.error('GET /api/dyspozycja/przydziel:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Błąd odczytu' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dyspozycja/przydziel
 * Tworzy lub aktualizuje wpis w rozkład-godzin (przydział nauczyciela do przedmiotu w klasie na dany rok).
 * Body może zawierać opcjonalnie rok (I, II, III…) – używane do „Do przydzielenia” per rok w cyklu.
 * Zapis bezpośrednio do Postgres (Payload w tym kontekście się zawiesza).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { klasaId, przedmiotId, nauczycielId, rokSzkolny, godzinyTyg } = body ?? {};

    if (!klasaId || !przedmiotId || !nauczycielId || rokSzkolny == null || rokSzkolny === '') {
      return NextResponse.json(
        { error: 'Wymagane: klasaId, przedmiotId, nauczycielId, rokSzkolny' },
        { status: 400 }
      );
    }
    const hours = Number(godzinyTyg);
    if (!Number.isFinite(hours) || hours < 0.5 || hours > 10) {
      return NextResponse.json(
        { error: 'godzinyTyg musi być liczbą od 0.5 do 10' },
        { status: 400 }
      );
    }

    const rokNorm = String(rokSzkolny).trim().replace(/-/g, '/');
    if (!/^\d{4}\/\d{4}$/.test(rokNorm)) {
      return NextResponse.json(
        { error: 'rokSzkolny w formacie YYYY-YYYY lub YYYY/YYYY' },
        { status: 400 }
      );
    }

    const result = await zapiszDoPostgres({
      klasaId: toId(klasaId),
      przedmiotId: toId(przedmiotId),
      nauczycielId: toId(nauczycielId),
      rokSzkolny: rokNorm,
      godzinyTyg: hours,
      rok: typeof body.rok === 'string' ? body.rok.trim() || undefined : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/dyspozycja/przydziel:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Błąd zapisu' },
      { status: 500 }
    );
  }
}
