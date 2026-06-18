import { Klasy } from '@/collections/Klasy';
import { Nauczyciele } from '@/collections/Nauczyciele';
import type { CollectionConfig } from 'payload';

/**
 * Izolacja multi-tenant na zapisie (audyt [8]). update/delete MUSZĄ zwracać
 * Where ograniczone do właściciela (+ legacy null), nie boolean zależny od
 * przychodzącego body — inaczej można usunąć/edytować cudzy rekord po ID
 * (delete nie ma body → data.wlasciciel==null → dawniej true = pełny dostęp).
 */
type AccessFn = (args: { req: { user?: { id: string } | undefined } }) => unknown;

function fn(col: CollectionConfig, op: 'update' | 'delete'): AccessFn {
  return col.access![op] as unknown as AccessFn;
}

const KOLEKCJE: Array<[string, CollectionConfig]> = [
  ['Klasy', Klasy],
  ['Nauczyciele', Nauczyciele],
];

describe.each(KOLEKCJE)('izolacja zapisu — %s', (_nazwa, col) => {
  describe.each(['update', 'delete'] as const)('%s', (op) => {
    it('brak zalogowanego użytkownika → false', () => {
      expect(fn(col, op)({ req: { user: undefined } })).toBe(false);
    });

    it('zalogowany → Where ograniczone do właściciela (+ legacy bez właściciela)', () => {
      const wynik = fn(col, op)({ req: { user: { id: 'A' } } });
      expect(wynik).toEqual({
        or: [
          { wlasciciel: { equals: 'A' } },
          { wlasciciel: { exists: false } },
        ],
      });
    });

    it('nie zwraca true (brak pełnego dostępu do cudzych rekordów)', () => {
      expect(fn(col, op)({ req: { user: { id: 'A' } } })).not.toBe(true);
    });
  });
});
