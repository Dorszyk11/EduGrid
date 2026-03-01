import 'dotenv/config';
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { slateEditor } from '@payloadcms/richtext-slate';
import path from 'path';
import { getDbSslConfig } from './src/lib/dbSsl';

// Importy kolekcji (bez rozszerzenia .ts – Next.js/TypeScript nie pozwala na .ts w importach)
import { Users } from './src/collections/Users';
import { TypySzkol } from './src/collections/TypySzkol';
import { Przedmioty } from './src/collections/Przedmioty';
import { Klasy } from './src/collections/Klasy';
import { Nauczyciele } from './src/collections/Nauczyciele';
import { SiatkiGodzinMein } from './src/collections/SiatkiGodzinMein';
import { Kwalifikacje } from './src/collections/Kwalifikacje';
import { RozkladGodzin } from './src/collections/RozkladGodzin';
import { Zawody } from './src/collections/Zawody';
import { MapowaniaNazw } from './src/collections/MapowaniaNazw';
import { PrzydzialGodzinWybor } from './src/collections/PrzydzialGodzinWybor';

// Automatyczne wykrywanie URL:
// 1. PAYLOAD_PUBLIC_SERVER_URL (jeśli ustawione ręcznie)
// 2. VERCEL_URL (automatyczna zmienna Vercel, dostępna tylko na Vercel)
// 3. localhost (domyślnie dla developmentu)
const getServerURL = () => {
  if (process.env.PAYLOAD_PUBLIC_SERVER_URL) {
    return process.env.PAYLOAD_PUBLIC_SERVER_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
};

/** Supabase pooler (:5432 = session mode, :6543 = transaction mode).
 *  Drizzle-kit schema introspection uses parameterized queries ($1, $2…)
 *  which PgBouncer in *transaction* mode drops silently.
 *  Keep session-mode pooler (port 5432) — pool.max:2 already caps connections. */
function getConnectionString(): string | undefined {
  return process.env.DATABASE_URI || undefined;
}

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: getServerURL(),
  admin: {
    user: 'users',
  },
  editor: slateEditor({}),
  collections: [
    Users,
    TypySzkol,
    Przedmioty,
    Klasy,
    Nauczyciele,
    SiatkiGodzinMein,
    Kwalifikacje,
    RozkladGodzin,
    Zawody,
    MapowaniaNazw,
    PrzydzialGodzinWybor,
  ],
  db: postgresAdapter({
    pool: (() => {
      const uri = process.env.DATABASE_URI || '';
      const poolConfig: Record<string, unknown> = {
        connectionString: uri || undefined,
        max: 2,
        idleTimeoutMillis: 10000,
      };
      const sslConfig = getDbSslConfig(uri || undefined);
      if (sslConfig) {
        poolConfig.ssl = sslConfig;
      }
      return poolConfig;
    })(),
  }),
  typescript: {
    outputFile: path.resolve(process.cwd(), 'payload-types.ts'),
  },
  graphQL: {
    schemaOutputFile: path.resolve(process.cwd(), 'generated-schema.graphql'),
  },
});
