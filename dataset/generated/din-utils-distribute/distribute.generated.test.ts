import { describe, expect, it } from 'vitest';

import { calculator } from '../../calculator/number';
import { distribute } from './distribute';

const distributeAmount = distribute(calculator);

describe('distribute', () => {
  it('returns the ratios unchanged (same reference) when the ratios sum to zero', () => {
    const ratios = [0, 0, 0];
    const result = distributeAmount(100, ratios);

    expect(result).toBe(ratios);
  });

  it('returns the ratios unchanged when positive and negative ratios cancel out to zero', () => {
    const ratios = [1, -1];
    const result = distributeAmount(100, ratios);

    expect(result).toBe(ratios);
  });

  it('returns an empty array when given an empty ratios array', () => {
    const result = distributeAmount(100, []);

    expect(result).toEqual([]);
  });

  it('distributes an amount proportionally when it divides evenly (no remainder)', () => {
    const result = distributeAmount(100, [2, 3, 5]);

    expect(result).toEqual([20, 30, 50]);
  });

  it('keeps shares in the same order as the input ratios', () => {
    const result = distributeAmount(10, [0, 1, 0, 1]);

    expect(result).toEqual([0, 5, 0, 5]);
  });

  it('distributes a value of zero as all-zero shares', () => {
    const result = distributeAmount(0, [1, 2, 3]);

    expect(result).toEqual([0, 0, 0]);
  });

  it('gives a single ratio the entire amount', () => {
    const result = distributeAmount(100, [1]);

    expect(result).toEqual([100]);
  });

  it('assigns the remainder to the share(s) with the largest ratio first, in input order', () => {
    // total = 6; raw shares = [5, 3.33 -> 3, 1.67 -> 1]; remainder = 1 goes to ratio 3 (index 0)
    const result = distributeAmount(10, [3, 2, 1]);

    expect(result).toEqual([6, 3, 1]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it('prioritizes the largest ratio for the remainder regardless of its position in the input', () => {
    // total = 6; raw shares = [1.67 -> 1, 3.33 -> 3, 5]; remainder = 1 goes to the largest ratio (index 2, value 3)
    const result = distributeAmount(10, [1, 2, 3]);

    expect(result).toEqual([1, 3, 6]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it('distributes a multi-unit remainder across multiple indices by descending ratio', () => {
    // total = 6; raw shares = [11.5 -> 11, 7.67 -> 7, 3.83 -> 3]; remainder = 2
    const result = distributeAmount(23, [3, 2, 1]);

    expect(result).toEqual([12, 8, 3]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(23);
  });

  it('skips zero-ratio entries when distributing the remainder', () => {
    // total = 5; raw shares = [0, 6.6 -> 6, 0, 4.4 -> 4]; remainder = 1 goes to the largest nonzero ratio (index 1)
    const result = distributeAmount(11, [0, 3, 0, 2]);

    expect(result).toEqual([0, 7, 0, 4]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(11);
  });

  it('gives the sole remainder unit to the largest ratio even when all raw shares truncate to zero', () => {
    // total = 6; raw shares = [0, 0, 0]; remainder = 1 goes to the largest ratio (index 0)
    const result = distributeAmount(1, [3, 2, 1]);

    expect(result).toEqual([1, 0, 0]);
  });

  it('distributes an equal-ratio amount so shares sum to the original value (remainder spread as a multiset)', () => {
    const result = distributeAmount(100, [1, 1, 1]);

    expect(result).toHaveLength(3);
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    expect([...result].sort((a, b) => a - b)).toEqual([33, 33, 34]);
  });

  it('distributes a small equal-ratio amount correctly', () => {
    const result = distributeAmount(10, [1, 1, 1]);

    expect(result.reduce((a, b) => a + b, 0)).toBe(10);
    expect([...result].sort((a, b) => a - b)).toEqual([3, 3, 4]);
  });

  it('handles negative values by truncating toward zero and distributing the negative remainder', () => {
    const result = distributeAmount(-100, [1, 1, 1]);

    expect(result).toHaveLength(3);
    expect(result.reduce((a, b) => a + b, 0)).toBe(-100);
    expect([...result].sort((a, b) => a - b)).toEqual([-34, -33, -33]);
  });

  it('handles negative values with distinct ratios deterministically', () => {
    // total = 6; raw shares = trunc(-10*3/6)=-5, trunc(-10*2/6)=-3, trunc(-10*1/6)=-1; sum=-9; remainder=-1
    const result = distributeAmount(-10, [3, 2, 1]);

    expect(result).toEqual([-6, -3, -1]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(-10);
  });

  it('does not hang and still returns a well-formed result for values beyond Number.MAX_SAFE_INTEGER', () => {
    const hugeValue = Number.MAX_SAFE_INTEGER * 1000;
    const result = distributeAmount(hugeValue, [1, 3]);

    expect(result).toHaveLength(2);
    expect(Number.isFinite(result[0])).toBe(true);
    expect(Number.isFinite(result[1])).toBe(true);
  });
});
