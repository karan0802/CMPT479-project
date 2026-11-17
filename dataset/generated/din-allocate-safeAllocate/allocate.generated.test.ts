import { describe, it, expect } from 'vitest';

import { calculator } from '../../calculator/number';

import { safeAllocate } from './allocate';

interface FakeCurrency {
  code: string;
  base: number;
  exponent: number;
}

interface FakeDineroData {
  amount: number;
  currency: FakeCurrency;
  scale: number;
}

interface FakeDinero {
  toJSON: () => FakeDineroData;
  create: (data: FakeDineroData) => FakeDinero;
}

const USD: FakeCurrency = { code: 'USD', base: 10, exponent: 2 };

function createDinero(data: FakeDineroData): FakeDinero {
  return {
    toJSON: () => data,
    create: (newData: FakeDineroData) => createDinero(newData),
  };
}

const allocate = safeAllocate<number>(calculator);

describe('safeAllocate', () => {
  describe('successful allocation with plain-number ratios', () => {
    it('splits an amount evenly, assigning the remainder to the first ratio', () => {
      // Matches dinero.js's documented allocate(1245, [50, 50]) example.
      const dineroObject = createDinero({ amount: 1245, currency: USD, scale: 2 });

      const [share1, share2] = allocate(dineroObject as any, [50, 50]);

      expect(share1.toJSON()).toEqual({ amount: 623, currency: USD, scale: 2 });
      expect(share2.toJSON()).toEqual({ amount: 622, currency: USD, scale: 2 });
    });

    it('splits an amount proportionally across three ratios with no remainder', () => {
      const dineroObject = createDinero({ amount: 1000, currency: USD, scale: 2 });

      const [share1, share2, share3] = allocate(dineroObject as any, [2, 3, 5]);

      expect(share1.toJSON()).toEqual({ amount: 200, currency: USD, scale: 2 });
      expect(share2.toJSON()).toEqual({ amount: 300, currency: USD, scale: 2 });
      expect(share3.toJSON()).toEqual({ amount: 500, currency: USD, scale: 2 });
    });

    it('allocates everything to a single ratio', () => {
      const dineroObject = createDinero({ amount: 777, currency: USD, scale: 2 });

      const [share] = allocate(dineroObject as any, [1]);

      expect(share.toJSON()).toEqual({ amount: 777, currency: USD, scale: 2 });
    });

    it('returns one Dinero object per ratio', () => {
      const dineroObject = createDinero({ amount: 1000, currency: USD, scale: 2 });

      const shares = allocate(dineroObject as any, [1, 1, 1, 1]);

      expect(shares).toHaveLength(4);
    });

    it('preserves the original currency on every resulting share', () => {
      const dineroObject = createDinero({ amount: 1000, currency: USD, scale: 2 });

      const shares = allocate(dineroObject as any, [1, 1]);

      shares.forEach((share) => {
        expect(share.toJSON().currency).toEqual(USD);
      });
    });

    it('allows a zero ratio alongside a positive one, giving it nothing', () => {
      const dineroObject = createDinero({ amount: 500, currency: USD, scale: 0 });

      const [zeroShare, fullShare] = allocate(dineroObject as any, [0, 1]);

      expect(zeroShare.toJSON()).toEqual({ amount: 0, currency: USD, scale: 0 });
      expect(fullShare.toJSON()).toEqual({ amount: 500, currency: USD, scale: 0 });
    });

    it('does not mutate the original Dinero object data', () => {
      const data: FakeDineroData = { amount: 1245, currency: USD, scale: 2 };
      const dineroObject = createDinero(data);

      allocate(dineroObject as any, [50, 50]);

      expect(dineroObject.toJSON()).toEqual({ amount: 1245, currency: USD, scale: 2 });
    });
  });

  describe('ratio normalization across scales', () => {
    it('normalizes same-scale object ratios and raises the result scale accordingly', () => {
      const dineroObject = createDinero({ amount: 1200, currency: USD, scale: 2 });

      const [share1, share2] = allocate(dineroObject as any, [
        { amount: 5, scale: 1 },
        { amount: 5, scale: 1 },
      ]);

      expect(share1.toJSON()).toEqual({ amount: 6000, currency: USD, scale: 3 });
      expect(share2.toJSON()).toEqual({ amount: 6000, currency: USD, scale: 3 });
    });

    it('normalizes mixed plain-number and scaled-object ratios to the highest scale', () => {
      // ratio of 1 (scale 0) and 0.50 (scale 2) normalizes to 100:50, i.e. 2:1.
      const dineroObject = createDinero({ amount: 90, currency: USD, scale: 0 });

      const [share1, share2] = allocate(dineroObject as any, [1, { amount: 50, scale: 2 }]);

      expect(share1.toJSON()).toEqual({ amount: 6000, currency: USD, scale: 2 });
      expect(share2.toJSON()).toEqual({ amount: 3000, currency: USD, scale: 2 });
    });

    it('scales proportional object ratios that all share a non-zero scale', () => {
      const dineroObject = createDinero({ amount: 1000, currency: USD, scale: 2 });

      const [share1, share2, share3] = allocate(dineroObject as any, [
        { amount: 2, scale: 1 },
        { amount: 3, scale: 1 },
        { amount: 5, scale: 1 },
      ]);

      expect(share1.toJSON()).toEqual({ amount: 2000, currency: USD, scale: 3 });
      expect(share2.toJSON()).toEqual({ amount: 3000, currency: USD, scale: 3 });
      expect(share3.toJSON()).toEqual({ amount: 5000, currency: USD, scale: 3 });
    });
  });

  describe('invalid ratios', () => {
    it('throws when given an empty ratios array', () => {
      const dineroObject = createDinero({ amount: 1000, currency: USD, scale: 2 });

      expect(() => allocate(dineroObject as any, [])).toThrow();
    });

    it('throws when a plain-number ratio is negative', () => {
      const dineroObject = createDinero({ amount: 1000, currency: USD, scale: 2 });

      expect(() => allocate(dineroObject as any, [-1, 1])).toThrow();
    });

    it('throws when a scaled-object ratio is negative', () => {
      const dineroObject = createDinero({ amount: 1000, currency: USD, scale: 2 });

      expect(() =>
        allocate(dineroObject as any, [
          { amount: -10, scale: 2 },
          { amount: 50, scale: 2 },
        ])
      ).toThrow();
    });

    it('throws when every ratio is zero', () => {
      const dineroObject = createDinero({ amount: 1000, currency: USD, scale: 2 });

      expect(() => allocate(dineroObject as any, [0, 0])).toThrow();
    });

    it('throws when the only ratio provided is zero', () => {
      const dineroObject = createDinero({ amount: 1000, currency: USD, scale: 2 });

      expect(() => allocate(dineroObject as any, [0])).toThrow();
    });

    it('throws when ratios mix a negative value with zeros', () => {
      const dineroObject = createDinero({ amount: 1000, currency: USD, scale: 2 });

      expect(() => allocate(dineroObject as any, [0, -1])).toThrow();
    });
  });
});
