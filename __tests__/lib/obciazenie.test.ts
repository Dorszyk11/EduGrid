import { statusObciazeniaRaport } from '@/lib/obciazenie';

describe('statusObciazeniaRaport', () => {
  it('aktualne > max → przeciążenie (niezależnie od procentu)', () => {
    expect(statusObciazeniaRaport(20, 18, 111)).toEqual({ label: 'Przekroczone', key: 'PRZECIĄŻENIE' });
  });
  it('procent ≥ 90 (i nie przekroczone) → pełne', () => {
    expect(statusObciazeniaRaport(18, 18, 100)).toEqual({ label: 'Pełne', key: 'OK' });
    expect(statusObciazeniaRaport(16, 18, 90)).toEqual({ label: 'Pełne', key: 'OK' });
  });
  it('procent < 50 → niskie', () => {
    expect(statusObciazeniaRaport(8, 18, 44.4)).toEqual({ label: 'Niskie', key: 'NIEDOCIĄŻENIE' });
  });
  it('50–89% → w normie', () => {
    expect(statusObciazeniaRaport(12, 18, 66.7)).toEqual({ label: 'W normie', key: 'NEUTRAL' });
    expect(statusObciazeniaRaport(9, 18, 50)).toEqual({ label: 'W normie', key: 'NEUTRAL' });
  });
});
