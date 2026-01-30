import 'dotenv/config';
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { slateEditor } from '@payloadcms/richtext-slate';
import path from 'path';

// Importy kolekcji
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

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000',
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
  ],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI,
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
