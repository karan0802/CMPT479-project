import { describe, it, expect } from 'vitest';
import { parseLaba, rgbaToLaba } from './lab';

describe('parseLaba', () => {
  describe('input validation', () => {
    it('returns null when l is missing', () => {
      expect(parseLaba({ a: 0, b: 0 })).toBeNull();
    });

    it('returns null when a is missing', () => {
      expect(parseLaba({ l: 50, b: 0 })).toBeNull();
    });

    it('returns null when b is missing', () => {
      expect(parseLaba({ l: 50, a: 0 })).toBeNull();
    });

    it('returns null when l, a and b are all missing', () => {
      expect(parseLaba({})).toBeNull();
    });

    it('returns null when a required value is explicitly null', () => {
      expect(parseLaba({ l: 50, a: 0, b: null } as any)).toBeNull();
    });

    it('returns null when a required value is explicitly undefined', () => {
      expect(parseLaba({ l: 50, a: undefined, b: 0 })).toBeNull();
    });

    it('treats 0 as a present value and does not return null', () => {
      const result = parseLaba({ l: 0, a: 0, b: 0 });
      expect(result).not.toBeNull();
    });
  });

  describe('alpha handling', () => {
    it('defaults alpha to 1 when it is omitted', () => {
      const result = parseLaba({ l: 50, a: 0, b: 0 })!;
      expect(result).not.toBeNull();
      expect(result.a).toBeCloseTo(1, 2);
    });

    it('passes through a valid alpha value unchanged', () => {
      const result = parseLaba({ l: 50, a: 0, b: 0, alpha: 0.37 })!;
      expect(result.a).toBeCloseTo(0.37, 2);
    });

    it('clamps alpha values above 1 down to 1', () => {
      const result = parseLaba({ l: 50, a: 0, b: 0, alpha: 2 })!;
      expect(result.a).toBeCloseTo(1, 2);
    });

    it('clamps negative alpha values up to 0', () => {
      const result = parseLaba({ l: 50, a: 0, b: 0, alpha: -1 })!;
      expect(result.a).toBeCloseTo(0, 2);
    });
  });

  describe('known color conversions', () => {
    it('converts l=0, a=0, b=0 to black', () => {
      const result = parseLaba({ l: 0, a: 0, b: 0 })!;
      expect(result).not.toBeNull();
      expect(result.r).toBeCloseTo(0, 0);
      expect(result.g).toBeCloseTo(0, 0);
      expect(result.b).toBeCloseTo(0, 0);
      expect(result.a).toBeCloseTo(1, 2);
    });

    it('converts l=100, a=0, b=0 to white', () => {
      const result = parseLaba({ l: 100, a: 0, b: 0 })!;
      expect(result).not.toBeNull();
      expect(result.r).toBeCloseTo(255, 0);
      expect(result.g).toBeCloseTo(255, 0);
      expect(result.b).toBeCloseTo(255, 0);
      expect(result.a).toBeCloseTo(1, 2);
    });
  });

  describe('numeric string inputs', () => {
    it('accepts numeric strings and produces the same result as numbers', () => {
      const fromNumbers = parseLaba({ l: 55, a: 12, b: -8, alpha: 0.6 })!;
      const fromStrings = parseLaba({ l: '55', a: '12', b: '-8', alpha: '0.6' })!;

      expect(fromStrings.r).toBeCloseTo(fromNumbers.r, 5);
      expect(fromStrings.g).toBeCloseTo(fromNumbers.g, 5);
      expect(fromStrings.b).toBeCloseTo(fromNumbers.b, 5);
      expect(fromStrings.a).toBeCloseTo(fromNumbers.a, 5);
    });

    it('produces NaN components for a non-numeric string', () => {
      const result = parseLaba({ l: 'not-a-number', a: 0, b: 0 })!;
      expect(result).not.toBeNull();
      expect(Number.isNaN(result.r)).toBe(true);
    });
  });

  describe('lightness clamping', () => {
    it('clamps negative l values to 0', () => {
      const clamped = parseLaba({ l: -50, a: 10, b: -10 })!;
      const atZero = parseLaba({ l: 0, a: 10, b: -10 })!;

      expect(clamped.r).toBeCloseTo(atZero.r, 5);
      expect(clamped.g).toBeCloseTo(atZero.g, 5);
      expect(clamped.b).toBeCloseTo(atZero.b, 5);
    });

    it('clamps l values above 400 to 400', () => {
      const clamped = parseLaba({ l: 500, a: 10, b: -10 })!;
      const atMax = parseLaba({ l: 400, a: 10, b: -10 })!;

      expect(clamped.r).toBeCloseTo(atMax.r, 5);
      expect(clamped.g).toBeCloseTo(atMax.g, 5);
      expect(clamped.b).toBeCloseTo(atMax.b, 5);
    });
  });

  describe('round-trip conversion via rgbaToLaba', () => {
    const cases = [
      { r: 0, g: 0, b: 0, a: 1 },
      { r: 255, g: 255, b: 255, a: 1 },
      { r: 255, g: 0, b: 0, a: 1 },
      { r: 0, g: 255, b: 0, a: 1 },
      { r: 0, g: 0, b: 255, a: 1 },
      { r: 128, g: 128, b: 128, a: 1 },
      { r: 200, g: 120, b: 50, a: 0.8 },
      { r: 10, g: 200, b: 90, a: 0.33 },
    ];

    cases.forEach((rgba) => {
      it(`round-trips rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a}) through Lab`, () => {
        const laba = rgbaToLaba(rgba);
        const result = parseLaba(laba)!;

        expect(result).not.toBeNull();
        expect(result.r).toBeCloseTo(rgba.r, 0);
        expect(result.g).toBeCloseTo(rgba.g, 0);
        expect(result.b).toBeCloseTo(rgba.b, 0);
        expect(result.a).toBeCloseTo(rgba.a, 2);
      });
    });
  });
});
