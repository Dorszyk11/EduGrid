import { getPayload } from 'payload';
import config from '@/payload.config';

// Typ Payload - zwracany przez getPayload
export type Payload = Awaited<ReturnType<typeof getPayload>>;
