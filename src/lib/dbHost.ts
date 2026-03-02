import { lookup } from 'node:dns/promises';

function getDatabaseHost(connectionString?: string): string | null {
  if (!connectionString) return null;
  try {
    const parsed = new URL(connectionString);
    return parsed.hostname || null;
  } catch {
    return null;
  }
}

export async function assertDatabaseHostResolvable(connectionString?: string): Promise<void> {
  const host = getDatabaseHost(connectionString);
  if (!host) return;

  try {
    await lookup(host);
  } catch (error: unknown) {
    const details =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: string }).code ?? '')
        : '';
    throw new Error(
      `Nie można rozpoznać hosta bazy danych (${host})${details ? `: ${details}` : ''}. Sprawdź DATABASE_URI w .env.`
    );
  }
}
