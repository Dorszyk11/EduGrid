type PgSslOption = { rejectUnauthorized: boolean } | undefined;

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
}

function isRemoteHost(connectionString?: string): boolean {
  if (!connectionString) return false;
  try {
    const url = new URL(connectionString);
    const host = (url.hostname || '').toLowerCase();
    return !['localhost', '127.0.0.1', '::1'].includes(host);
  } catch {
    return false;
  }
}

/**
 * Sterowanie SSL dla Postgresa:
 * - DB_SSL_MODE=disable|off|false => bez SSL
 * - DB_SSL_MODE=require|verify-ca|verify-full|true => SSL
 * - DB_SSL_MODE=auto (domyślnie) => SSL dla hostów zdalnych
 * - DB_SSL_REJECT_UNAUTHORIZED=true|false => wymusza weryfikację certyfikatu
 * - DB_SSL_SELF_SIGNED=true => skrót dla rejectUnauthorized=false
 */
export function getDbSslConfig(connectionString?: string): PgSslOption {
  const sslMode = (process.env.DB_SSL_MODE ?? 'auto').trim().toLowerCase();
  const rejectUnauthorizedFromEnv = parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED);
  const selfSigned = parseBoolean(process.env.DB_SSL_SELF_SIGNED) === true;

  if (['disable', 'off', 'false'].includes(sslMode)) return undefined;

  const forceSsl = ['require', 'verify-ca', 'verify-full', 'true'].includes(sslMode);
  const useSsl = forceSsl || (sslMode === 'auto' && isRemoteHost(connectionString));
  if (!useSsl) return undefined;

  if (typeof rejectUnauthorizedFromEnv === 'boolean') {
    return { rejectUnauthorized: rejectUnauthorizedFromEnv };
  }

  return { rejectUnauthorized: !selfSigned };
}
