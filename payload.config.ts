import 'dotenv/config';
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { slateEditor } from '@payloadcms/richtext-slate';
import path from 'path';

// Importy kolekcji (z rozszerzeniem .ts dla Payload CLI / ESM)
import { Users } from './src/collections/Users.ts';
import { TypySzkol } from './src/collections/TypySzkol.ts';
import { Przedmioty } from './src/collections/Przedmioty.ts';
import { Klasy } from './src/collections/Klasy.ts';
import { Nauczyciele } from './src/collections/Nauczyciele.ts';
import { SiatkiGodzinMein } from './src/collections/SiatkiGodzinMein.ts';
import { Kwalifikacje } from './src/collections/Kwalifikacje.ts';
import { RozkladGodzin } from './src/collections/RozkladGodzin.ts';
import { Zawody } from './src/collections/Zawody.ts';
import { MapowaniaNazw } from './src/collections/MapowaniaNazw.ts';
import { PrzydzialGodzinWybor } from './src/collections/PrzydzialGodzinWybor.ts';

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

/** Dla Supabase poolera: użyj Transaction mode (port 6543), żeby uniknąć błędu "max clients reached". */
function getConnectionString(): string | undefined {
  const uri = process.env.DATABASE_URI;
  if (!uri) return undefined;
  if (uri.includes('pooler.supabase.com') && uri.includes(':5432/')) {
    return uri.replace(':5432/', ':6543/');
  }
  return uri;
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
    pool: {
      connectionString: getConnectionString(),
      max: 2,
      idleTimeoutMillis: 10000,
      ...(process.env.DATABASE_URI?.includes('supabase') && {
        ssl: { rejectUnauthorized: false },
      }),
    },
  }),
  typescript: {
    outputFile: path.resolve(process.cwd(), 'payload-types.ts'),
  },
  graphQL: {
    schemaOutputFile: path.resolve(process.cwd(), 'generated-schema.graphql'),
  },
});
