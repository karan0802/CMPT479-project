import { describe, it, expect } from 'vitest';

import { DineroComparisonOperator } from '../../../core';

import { compare } from './compare';

describe('compare', () => {
  it('returns LT when the first bigint is less than the second', () => {
    expect(compare(1n, 2n)).toBe(DineroComparisonOperator.LT);
  });

  it('returns GT when the first bigint is greater than the second', () => {
    expect(compare(2n, 1n)).toBe(DineroComparisonOperator.GT);
  });

  it('returns EQ when the two bigints are equal', () => {
    expect(compare(2n, 2n)).toBe(DineroComparisonOperator.EQ);
  });

  it('returns EQ when comparing zero to zero', () => {
    expect(compare(0n, 0n)).toBe(DineroComparisonOperator.EQ);
  });

  it('returns LT when the first bigint is negative and the second is zero', () => {
    expect(compare(-1n, 0n)).toBe(DineroComparisonOperator.LT);
  });

  it('returns GT when the first bigint is zero and the second is negative', () => {
    expect(compare(0n, -1n)).toBe(DineroComparisonOperator.GT);
  });

  it('returns LT when comparing a negative bigint to a positive bigint', () => {
    expect(compare(-5n, 5n)).toBe(DineroComparisonOperator.LT);
  });

  it('returns GT when comparing a positive bigint to a negative bigint', () => {
    expect(compare(5n, -5n)).toBe(DineroComparisonOperator.GT);
  });

  it('returns EQ when comparing two equal negative bigints', () => {
    expect(compare(-3n, -3n)).toBe(DineroComparisonOperator.EQ);
  });

  it('returns LT when comparing two negative bigints where the first is more negative', () => {
    expect(compare(-10n, -3n)).toBe(DineroComparisonOperator.LT);
  });

  it('returns GT when comparing two negative bigints where the first is less negative', () => {
    expect(compare(-3n, -10n)).toBe(DineroComparisonOperator.GT);
  });

  it('handles very large bigints correctly for LT', () => {
    const a = 10n ** 30n;
    const b = 10n ** 30n + 1n;

    expect(compare(a, b)).toBe(DineroComparisonOperator.LT);
  });

  it('handles very large bigints correctly for GT', () => {
    const a = 10n ** 30n + 1n;
    const b = 10n ** 30n;

    expect(compare(a, b)).toBe(DineroComparisonOperator.GT);
  });

  it('handles very large bigints correctly for EQ', () => {
    const a = 10n ** 30n;
    const b = 10n ** 30n;

    expect(compare(a, b)).toBe(DineroComparisonOperator.EQ);
  });

  it('handles very large negative bigints correctly', () => {
    const a = -(10n ** 30n) - 1n;
    const b = -(10n ** 30n);

    expect(compare(a, b)).toBe(DineroComparisonOperator.LT);
  });
});
