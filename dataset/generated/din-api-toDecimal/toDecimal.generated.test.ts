import { describe, expect, it } from 'vitest';

import { calculator } from '../../calculator/number';

import { toDecimal } from './toDecimal';

type FakeCurrency = {
  code: string;
  base: number | readonly number[];
  exponent: number;
};

type FakeDineroJSON = {
  amount: number;
  currency: FakeCurrency;
  scale: number;
};

type FakeDinero = {
  toJSON: () => FakeDineroJSON;
  formatter: {
    toNumber: (value: number) => number;
    toString: (value: number) => string;
  };
};

/**
 * Builds a minimal Dinero-like object that exposes exactly what `toDecimal`
 * relies on: `toJSON()` (amount/currency/scale) and a `formatter` with
 * `toNumber`/`toString`. This mirrors the number-backed calculator's own
 * (de)serialization, where values are plain JS numbers.
 */
function createDinero(
  amount: number,
  scale: number,
  currency: Partial<FakeCurrency> = {}
): FakeDinero {
  const resolvedCurrency: FakeCurrency = {
    code: 'USD',
    base: 10,
    exponent: scale,
    ...currency,
  };

  return {
    toJSON: () => ({ amount, currency: resolvedCurrency, scale }),
    formatter: {
      toNumber: (value: number) => value,
      toString: (value: number) => value.toString(),
    },
  };
}

describe('toDecimal', () => {
  const toDecimalFn = toDecimal<number, unknown>(calculator);

  it('converts a positive amount into a decimal string', () => {
    const dineroObject = createDinero(3456, 2);

    expect(toDecimalFn(dineroObject as any)).toBe('34.56');
  });

  it('accepts a currency whose base is a higher multiple of ten', () => {
    const dineroObject = createDinero(250, 2, { base: 100, exponent: 2 });

    expect(toDecimalFn(dineroObject as any)).toBe('2.50');
  });

  it('omits the fractional part and separator when scale is zero', () => {
    const dineroObject = createDinero(100, 0, { base: 10, exponent: 0 });

    expect(toDecimalFn(dineroObject as any)).toBe('100');
  });

  it('pads the fractional part with leading zeros to match the scale', () => {
    const dineroObject = createDinero(100005, 4, { base: 10, exponent: 4 });

    expect(toDecimalFn(dineroObject as any)).toBe('10.0005');
  });

  it('formats a negative amount whose whole part is non-zero', () => {
    const dineroObject = createDinero(-3456, 2);

    expect(toDecimalFn(dineroObject as any)).toBe('-34.56');
  });

  it('adds a leading negative sign when the whole part is a negative zero', () => {
    const dineroObject = createDinero(-6, 2);

    expect(toDecimalFn(dineroObject as any)).toBe('-0.06');
  });

  it('does not add a negative sign for a small positive amount', () => {
    const dineroObject = createDinero(6, 2);

    expect(toDecimalFn(dineroObject as any)).toBe('0.06');
  });

  it('formats a zero amount correctly', () => {
    const dineroObject = createDinero(0, 2);

    expect(toDecimalFn(dineroObject as any)).toBe('0.00');
  });

  it('passes the computed value and currency to a provided transformer and returns its result', () => {
    const dineroObject = createDinero(3456, 2, { code: 'EUR' });

    const transformer = ({
      value,
      currency,
    }: {
      value: string;
      currency: FakeCurrency;
    }) => `${currency.code} ${value}`;

    expect(toDecimalFn(dineroObject as any, transformer as any)).toBe(
      'EUR 34.56'
    );
  });

  it('returns the raw decimal value when no transformer is provided', () => {
    const dineroObject = createDinero(1299, 2);

    const result = toDecimalFn(dineroObject as any);

    expect(typeof result).toBe('string');
    expect(result).toBe('12.99');
  });

  it('throws when the currency has a compound (array) base', () => {
    const dineroObject = createDinero(100, 1, {
      base: [20, 12],
      exponent: 1,
    });

    expect(() => toDecimalFn(dineroObject as any)).toThrow();
  });

  it('throws when the currency base is not a multiple of ten', () => {
    const dineroObject = createDinero(100, 1, { base: 12, exponent: 1 });

    expect(() => toDecimalFn(dineroObject as any)).toThrow();
  });

  it('throws for another non-decimal base as well', () => {
    const dineroObject = createDinero(100, 1, { base: 16, exponent: 1 });

    expect(() => toDecimalFn(dineroObject as any)).toThrow();
  });
});
