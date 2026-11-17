import { describe, it, expect } from 'vitest';
import { toUnits } from './toUnits';
import { calculator } from '../../calculator/number';

type FakeCurrency = {
  readonly code: string;
  readonly base: number | readonly number[];
  readonly exponent: number;
};

/**
 * Minimal stand-in for a Dinero object: `toUnits` only ever calls
 * `.toJSON()` on its input, so that's all this fixture needs to provide.
 */
function createDineroObject(
  amount: number,
  currency: FakeCurrency,
  scale: number
): any {
  return {
    toJSON: () => ({ amount, currency, scale }),
  };
}

const USD: FakeCurrency = { code: 'USD', base: 10, exponent: 2 };

describe('toUnits', () => {
  describe('scalar base currencies', () => {
    it('splits the amount into a major unit and a remainder', () => {
      const dineroObject = createDineroObject(1234, USD, 2);

      const value = toUnits(calculator)(dineroObject) as number[];

      expect(value).toEqual([12, 34]);
    });

    it('returns a plain array when no transformer is provided', () => {
      const dineroObject = createDineroObject(1234, USD, 2);

      const value = toUnits(calculator)(dineroObject) as number[];

      expect(Array.isArray(value)).toBe(true);
      expect(value).toHaveLength(2);
    });

    it('returns a zero remainder when the amount divides evenly', () => {
      const dineroObject = createDineroObject(1200, USD, 2);

      const value = toUnits(calculator)(dineroObject) as number[];

      expect(value).toEqual([12, 0]);
    });

    it('returns [0, 0] for a zero amount', () => {
      const dineroObject = createDineroObject(0, USD, 2);

      const value = toUnits(calculator)(dineroObject) as number[];

      expect(value).toEqual([0, 0]);
    });

    it('treats a scale of 0 as a single, undivided unit', () => {
      const currency: FakeCurrency = { code: 'JPY', base: 10, exponent: 0 };
      const dineroObject = createDineroObject(42, currency, 0);

      const value = toUnits(calculator)(dineroObject) as number[];

      expect(value).toEqual([42, 0]);
    });

    it('supports a base other than 10', () => {
      const currency: FakeCurrency = { code: 'XTS', base: 1000, exponent: 1 };
      const dineroObject = createDineroObject(2500, currency, 1);

      const value = toUnits(calculator)(dineroObject) as number[];

      expect(value).toEqual([2, 500]);
    });

    it('is consistent with the calculator primitives for negative amounts', () => {
      const dineroObject = createDineroObject(-1234, USD, 2);

      const divisor = calculator.power(10, 2);
      const expected = [
        calculator.integerDivide(-1234, divisor),
        calculator.modulo(-1234, divisor),
      ];

      const value = toUnits(calculator)(dineroObject) as number[];

      expect(value).toEqual(expected);
    });

    it('wrapping the base in a single-element array yields the same result as the scalar base', () => {
      const arrayCurrency: FakeCurrency = {
        code: 'USD',
        base: [10],
        exponent: 2,
      };
      const dineroObject = createDineroObject(1234, arrayCurrency, 2);

      const value = toUnits(calculator)(dineroObject) as number[];

      expect(value).toEqual([12, 34]);
    });
  });

  describe('multi-base currencies', () => {
    it('produces one entry per base plus a final remainder', () => {
      const currency: FakeCurrency = { code: 'XTS', base: [20, 12], exponent: 0 };
      const dineroObject = createDineroObject(1035, currency, 0);

      const value = toUnits(calculator)(dineroObject) as number[];

      expect(value).toHaveLength(3);
      value.forEach((entry) => {
        expect(typeof entry).toBe('number');
        expect(Number.isFinite(entry)).toBe(true);
      });
    });

    it('resolves every level to zero when the amount is zero', () => {
      const currency: FakeCurrency = { code: 'XTS', base: [20, 12], exponent: 0 };
      const dineroObject = createDineroObject(0, currency, 0);

      const value = toUnits(calculator)(dineroObject) as number[];

      expect(value).toEqual([0, 0, 0]);
    });

    it('scales with the number of base levels', () => {
      const currency: FakeCurrency = {
        code: 'XTS',
        base: [20, 12, 4],
        exponent: 0,
      };
      const dineroObject = createDineroObject(0, currency, 0);

      const value = toUnits(calculator)(dineroObject) as number[];

      expect(value).toEqual([0, 0, 0, 0]);
    });
  });

  describe('transformer', () => {
    it('passes the computed value and currency to the transformer', () => {
      const dineroObject = createDineroObject(1234, USD, 2);
      const calls: Array<{ value: readonly number[]; currency: unknown }> = [];

      const transformer = (args: {
        value: readonly number[];
        currency: unknown;
      }) => {
        calls.push(args);
        return `${args.value[0]}.${args.value[1]}`;
      };

      toUnits(calculator)(dineroObject, transformer as any);

      expect(calls).toHaveLength(1);
      expect(calls[0].value).toEqual([12, 34]);
      expect(calls[0].currency).toBe(USD);
    });

    it('returns whatever the transformer returns instead of the raw array', () => {
      const dineroObject = createDineroObject(1234, USD, 2);

      const transformer = (args: { value: readonly number[]; currency: unknown }) => ({
        formatted: `${args.value[0]}.${args.value[1]}`,
      });

      const result = toUnits(calculator)(dineroObject, transformer as any);

      expect(result).toEqual({ formatted: '12.34' });
    });

    it('is not invoked when omitted, returning the raw array', () => {
      const dineroObject = createDineroObject(1234, USD, 2);

      const value = toUnits(calculator)(dineroObject, undefined) as number[];

      expect(value).toEqual([12, 34]);
    });
  });

  describe('currying', () => {
    it('can be reused across multiple dinero objects independently', () => {
      const toUnitsFn = toUnits(calculator);

      const first = toUnitsFn(createDineroObject(1234, USD, 2)) as number[];
      const second = toUnitsFn(createDineroObject(500, USD, 2)) as number[];

      expect(first).toEqual([12, 34]);
      expect(second).toEqual([5, 0]);
    });
  });
});
