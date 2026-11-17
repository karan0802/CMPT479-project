import { describe, it, expect } from 'vitest';

import { calculator } from '../../calculator/number';

import { halfUp } from './halfUp';

describe('halfUp', () => {
  it('returns the exact quotient when the amount divides evenly', () => {
    expect(halfUp(10, 5, calculator)).toBe(2);
    expect(halfUp(-10, 5, calculator)).toBe(-2);
    expect(halfUp(0, 7, calculator)).toBe(0);
    expect(halfUp(21, 7, calculator)).toBe(3);
  });

  it('rounds down for positive quotients whose remainder is less than half the factor', () => {
    expect(halfUp(4, 3, calculator)).toBe(1); // 1.333...
    expect(halfUp(9, 4, calculator)).toBe(2); // 2.25
    expect(halfUp(10, 3, calculator)).toBe(3); // 3.333...
  });

  it('rounds up for positive quotients whose remainder is greater than half the factor', () => {
    expect(halfUp(5, 3, calculator)).toBe(2); // 1.666...
    expect(halfUp(7, 4, calculator)).toBe(2); // 1.75
    expect(halfUp(11, 3, calculator)).toBe(4); // 3.666...
  });

  it('rounds up for positive quotients that are exactly half', () => {
    expect(halfUp(1, 2, calculator)).toBe(1); // 0.5
    expect(halfUp(7, 2, calculator)).toBe(4); // 3.5
    expect(halfUp(9, 6, calculator)).toBe(2); // 1.5
    expect(halfUp(15, 10, calculator)).toBe(2); // 1.5
  });

  it('rounds up (towards positive infinity) for negative quotients that are exactly half', () => {
    expect(halfUp(-3, 2, calculator)).toBe(-1); // -1.5
    expect(halfUp(-7, 2, calculator)).toBe(-3); // -3.5
    expect(halfUp(-9, 6, calculator)).toBe(-1); // -1.5
  });

  it('rounds negative quotients to the nearer integer when the remainder is less than half the factor', () => {
    expect(halfUp(-4, 3, calculator)).toBe(-1); // -1.333...
    expect(halfUp(-14, 10, calculator)).toBe(-1); // -1.4
    expect(halfUp(-10, 3, calculator)).toBe(-3); // -3.333...
  });

  it('rounds negative quotients to the nearer integer when the remainder is greater than half the factor', () => {
    expect(halfUp(-5, 3, calculator)).toBe(-2); // -1.666...
    expect(halfUp(-11, 4, calculator)).toBe(-3); // -2.75
    expect(halfUp(-11, 3, calculator)).toBe(-4); // -3.666...
  });

  it('handles a factor of 1 by returning the amount unchanged', () => {
    expect(halfUp(5, 1, calculator)).toBe(5);
    expect(halfUp(-5, 1, calculator)).toBe(-5);
    expect(halfUp(0, 1, calculator)).toBe(0);
  });

  it('handles large amounts correctly', () => {
    expect(halfUp(1000000003, 2, calculator)).toBe(500000002); // 500000001.5 -> up
    expect(halfUp(999999999, 4, calculator)).toBe(250000000); // 249999999.75 -> up
    expect(halfUp(-1000000003, 2, calculator)).toBe(-500000001); // -500000001.5 -> up
  });

  it('matches Math.round semantics across a broad range of amount/factor pairs', () => {
    const factors = [2, 3, 4, 5, 6, 7, 8, 9];
    const amounts: number[] = [];

    for (let a = -60; a <= 60; a += 1) {
      amounts.push(a);
    }

    factors.forEach((factor) => {
      amounts.forEach((amount) => {
        const expected = Math.round(amount / factor);

        // Skip cases that round to a zero result for a negative amount:
        // Math.round can yield a negative zero there (e.g. Math.round(-0.4) === -0),
        // which is not a meaningful distinction for this comparison.
        if (amount < 0 && expected === 0) {
          return;
        }

        expect(halfUp(amount, factor, calculator)).toBe(expected);
      });
    });
  });
});
