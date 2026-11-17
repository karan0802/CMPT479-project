import { describe, it, expect } from 'vitest';
import { parseCmyka } from './cmyk';

describe('parseCmyka', () => {
  describe('missing required channels', () => {
    it('returns null when c is missing', () => {
      expect(parseCmyka({ m: 0, y: 0, k: 0 })).toBeNull();
    });

    it('returns null when m is missing', () => {
      expect(parseCmyka({ c: 0, y: 0, k: 0 })).toBeNull();
    });

    it('returns null when y is missing', () => {
      expect(parseCmyka({ c: 0, m: 0, k: 0 })).toBeNull();
    });

    it('returns null when k is missing', () => {
      expect(parseCmyka({ c: 0, m: 0, y: 0 })).toBeNull();
    });

    it('returns null for an empty object', () => {
      expect(parseCmyka({})).toBeNull();
    });

    it('returns null when all required channels are explicitly undefined', () => {
      expect(
        parseCmyka({ c: undefined, m: undefined, y: undefined, k: undefined })
      ).toBeNull();
    });

    it('treats zero values for c, m, y, k as present (not missing)', () => {
      expect(parseCmyka({ c: 0, m: 0, y: 0, k: 0 })).not.toBeNull();
    });
  });

  describe('basic color conversions', () => {
    it('converts c:0 m:0 y:0 k:0 to white with default alpha of 1', () => {
      expect(parseCmyka({ c: 0, m: 0, y: 0, k: 0 })).toEqual({
        r: 255,
        g: 255,
        b: 255,
        a: 1,
      });
    });

    it('converts k:100 to black regardless of other channels being 0', () => {
      expect(parseCmyka({ c: 0, m: 0, y: 0, k: 100 })).toEqual({
        r: 0,
        g: 0,
        b: 0,
        a: 1,
      });
    });

    it('converts pure cyan (c:100) correctly', () => {
      expect(parseCmyka({ c: 100, m: 0, y: 0, k: 0 })).toEqual({
        r: 0,
        g: 255,
        b: 255,
        a: 1,
      });
    });

    it('converts pure magenta (m:100) correctly', () => {
      expect(parseCmyka({ c: 0, m: 100, y: 0, k: 0 })).toEqual({
        r: 255,
        g: 0,
        b: 255,
        a: 1,
      });
    });

    it('converts pure yellow (y:100) correctly', () => {
      expect(parseCmyka({ c: 0, m: 0, y: 100, k: 0 })).toEqual({
        r: 255,
        g: 255,
        b: 0,
        a: 1,
      });
    });

    it('converts a general cmyk combination correctly', () => {
      // r = round(255 * (1 - 0.2) * (1 - 0.2)) = round(163.2) = 163
      // g = round(255 * (1 - 0.4) * (1 - 0.2)) = round(122.4) = 122
      // b = round(255 * (1 - 0.6) * (1 - 0.2)) = round(81.6)  = 82
      expect(parseCmyka({ c: 20, m: 40, y: 60, k: 20 })).toEqual({
        r: 163,
        g: 122,
        b: 82,
        a: 1,
      });
    });
  });

  describe('alpha handling', () => {
    it('defaults alpha to 1 when omitted', () => {
      const result = parseCmyka({ c: 0, m: 0, y: 0, k: 0 });
      expect(result?.a).toBe(1);
    });

    it('uses the provided alpha value', () => {
      expect(parseCmyka({ c: 0, m: 0, y: 0, k: 0, a: 0.5 })).toEqual({
        r: 255,
        g: 255,
        b: 255,
        a: 0.5,
      });
    });

    it('clamps alpha above 1 down to 1', () => {
      expect(parseCmyka({ c: 0, m: 0, y: 0, k: 0, a: 1.5 })).toEqual({
        r: 255,
        g: 255,
        b: 255,
        a: 1,
      });
    });

    it('clamps negative alpha up to 0', () => {
      expect(parseCmyka({ c: 0, m: 0, y: 0, k: 0, a: -0.5 })).toEqual({
        r: 255,
        g: 255,
        b: 255,
        a: 0,
      });
    });

    it('falls back to the default alpha of 1 when alpha is explicitly undefined', () => {
      expect(
        parseCmyka({ c: 0, m: 0, y: 0, k: 0, a: undefined })
      ).toEqual({
        r: 255,
        g: 255,
        b: 255,
        a: 1,
      });
    });

    it('treats an explicit null alpha as Number(null) = 0, not the default', () => {
      expect(parseCmyka({ c: 0, m: 0, y: 0, k: 0, a: null as unknown as number })).toEqual({
        r: 255,
        g: 255,
        b: 255,
        a: 0,
      });
    });

    it('accepts an explicit alpha of 0', () => {
      expect(parseCmyka({ c: 0, m: 0, y: 0, k: 0, a: 0 })).toEqual({
        r: 255,
        g: 255,
        b: 255,
        a: 0,
      });
    });
  });

  describe('clamping of c, m, y, k channels', () => {
    it('clamps c above 100 down to 100', () => {
      expect(parseCmyka({ c: 150, m: 0, y: 0, k: 0 })).toEqual({
        r: 0,
        g: 255,
        b: 255,
        a: 1,
      });
    });

    it('clamps c below 0 up to 0', () => {
      expect(parseCmyka({ c: -50, m: 0, y: 0, k: 0 })).toEqual({
        r: 255,
        g: 255,
        b: 255,
        a: 1,
      });
    });

    it('clamps m and y above 100 down to 100', () => {
      expect(parseCmyka({ c: 0, m: 150, y: 150, k: 0 })).toEqual({
        r: 255,
        g: 0,
        b: 0,
        a: 1,
      });
    });

    it('clamps k below 0 up to 0', () => {
      expect(parseCmyka({ c: 0, m: 0, y: 0, k: -50 })).toEqual({
        r: 255,
        g: 255,
        b: 255,
        a: 1,
      });
    });

    it('clamps all negative channel values up to 0', () => {
      expect(parseCmyka({ c: -10, m: -20, y: -30, k: -40 })).toEqual({
        r: 255,
        g: 255,
        b: 255,
        a: 1,
      });
    });
  });

  describe('numeric string inputs', () => {
    it('parses numeric strings for c, m, y, k and a', () => {
      // Same combination as the "general cmyk combination" test above.
      expect(
        parseCmyka({ c: '20', m: '40', y: '60', k: '20', a: '0.5' })
      ).toEqual({
        r: 163,
        g: 122,
        b: 82,
        a: 0.5,
      });
    });

    it('parses all-zero numeric strings as white', () => {
      expect(parseCmyka({ c: '0', m: '0', y: '0', k: '0' })).toEqual({
        r: 255,
        g: 255,
        b: 255,
        a: 1,
      });
    });
  });
});
