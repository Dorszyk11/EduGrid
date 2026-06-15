import { verifyPassword, hashPassword } from '@/lib/auth/haslo';

describe('verifyPassword / hashPassword', () => {
  it('weryfikuje poprawne hasło (round-trip)', async () => {
    const { salt, hash } = await hashPassword('TajneHaslo123');
    await expect(verifyPassword('TajneHaslo123', salt, hash)).resolves.toBe(true);
  });

  it('odrzuca błędne hasło', async () => {
    const { salt, hash } = await hashPassword('TajneHaslo123');
    await expect(verifyPassword('zleHaslo', salt, hash)).resolves.toBe(false);
  });

  it('jest deterministyczny dla tej samej soli', async () => {
    const a = await hashPassword('abc', 'sól-stała');
    const b = await hashPassword('abc', 'sól-stała');
    expect(a.hash).toBe(b.hash);
  });

  it('zwraca false dla hashu o złej długości zamiast rzucać', async () => {
    const { salt } = await hashPassword('abc');
    await expect(verifyPassword('abc', salt, 'deadbeef')).resolves.toBe(false);
  });

  it('zwraca false dla hashu spoza hex (nie rzuca)', async () => {
    const { salt } = await hashPassword('abc');
    await expect(verifyPassword('abc', salt, 'nie-hex-zzz')).resolves.toBe(false);
  });
});
