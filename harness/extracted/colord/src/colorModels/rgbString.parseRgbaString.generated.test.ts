import { describe, it, expect } from 'vitest';
import { parseRgbaString } from './rgbString';

describe('parseRgbaString', () => {
  describe('comma syntax - integers', () => {
    it('parses a basic rgb() integer triplet with default alpha 1', () => {
      expect(parseRgbaString('rgb(255, 0, 128)')).toEqual({
        r: 255,
        g: 0,
        b: 128,
        a: 1,
      });
    });

    it('parses rgba() with an explicit numeric alpha', () => {
      expect(parseRgbaString('rgba(255, 0, 128, 0.5)')).toEqual({
        r: 255,
        g: 0,
        b: 128,
        a: 0.5,
      });
    });

    it('is case-insensitive for the function name', () => {
      expect(parseRgbaString('RGBA(255, 0, 0, 1)')).toEqual({
        r: 255,
        g: 0,
        b: 0,
        a: 1,
      });
      expect(parseRgbaString('RGB(10, 20, 30)')).toEqual({
        r: 10,
        g: 20,
        b: 30,
        a: 1,
      });
    });

    it('tolerates extra/irregular whitespace around values and parens', () => {
      expect(parseRgbaString('rgb( 255 ,   0 ,0 )')).toEqual({
        r: 255,
        g: 0,
        b: 0,
        a: 1,
      });
    });

    it('allows "rgb(" to accept a trailing alpha as well', () => {
      expect(parseRgbaString('rgb(10, 20, 30, 0.25)')).toEqual({
        r: 10,
        g: 20,
        b: 30,
        a: 0.25,
      });
    });

    it('parses decimal (non-integer) channel values', () => {
      const result = parseRgbaString('rgb(12.5, 0.5, 100.25)');
      expect(result).not.toBeNull();
      expect(result!.r).toBeCloseTo(12.5, 5);
      expect(result!.g).toBeCloseTo(0.5, 5);
      expect(result!.b).toBeCloseTo(100.25, 5);
      expect(result!.a).toBe(1);
    });

    it('parses values with an explicit leading plus sign', () => {
      expect(parseRgbaString('rgb(+255, +0, +128)')).toEqual({
        r: 255,
        g: 0,
        b: 128,
        a: 1,
      });
    });

    it('allows alpha to be a percentage while r/g/b are numbers', () => {
      const result = parseRgbaString('rgba(255, 0, 0, 50%)');
      expect(result).not.toBeNull();
      expect(result!.r).toBe(255);
      expect(result!.g).toBe(0);
      expect(result!.b).toBe(0);
      expect(result!.a).toBeCloseTo(0.5, 5);
    });
  });

  describe('comma syntax - percentages', () => {
    it('parses a percentage triplet, scaling to the 0-255 range', () => {
      const result = parseRgbaString('rgb(100%, 0%, 50%)');
      expect(result).not.toBeNull();
      expect(result!.r).toBeCloseTo(255, 5);
      expect(result!.g).toBeCloseTo(0, 5);
      expect(result!.b).toBeCloseTo(127.5, 5);
      expect(result!.a).toBe(1);
    });

    it('parses a percentage triplet with a numeric alpha', () => {
      const result = parseRgbaString('rgba(100%, 50%, 0%, 0.75)');
      expect(result).not.toBeNull();
      expect(result!.r).toBeCloseTo(255, 5);
      expect(result!.g).toBeCloseTo(127.5, 5);
      expect(result!.b).toBeCloseTo(0, 5);
      expect(result!.a).toBe(0.75);
    });

    it('parses a percentage triplet with a percentage alpha', () => {
      const result = parseRgbaString('rgba(100%, 50%, 0%, 50%)');
      expect(result).not.toBeNull();
      expect(result!.r).toBeCloseTo(255, 5);
      expect(result!.g).toBeCloseTo(127.5, 5);
      expect(result!.b).toBeCloseTo(0, 5);
      expect(result!.a).toBeCloseTo(0.5, 5);
    });

    it('rejects mixing numbers and percentages among r/g/b', () => {
      expect(parseRgbaString('rgb(255, 50%, 0)')).toBeNull();
      expect(parseRgbaString('rgb(50%, 255, 0)')).toBeNull();
      expect(parseRgbaString('rgb(0, 0, 50%)')).toBeNull();
    });
  });

  describe('whitespace syntax', () => {
    it('parses a space-separated integer triplet with no alpha', () => {
      expect(parseRgbaString('rgb(255 0 128)')).toEqual({
        r: 255,
        g: 0,
        b: 128,
        a: 1,
      });
    });

    it('parses a space-separated triplet with a slash-separated numeric alpha', () => {
      expect(parseRgbaString('rgba(255 0 128 / 0.5)')).toEqual({
        r: 255,
        g: 0,
        b: 128,
        a: 0.5,
      });
    });

    it('parses a space-separated percentage triplet with a percentage alpha', () => {
      const result = parseRgbaString('rgb(100% 0% 50% / 50%)');
      expect(result).not.toBeNull();
      expect(result!.r).toBeCloseTo(255, 5);
      expect(result!.g).toBeCloseTo(0, 5);
      expect(result!.b).toBeCloseTo(127.5, 5);
      expect(result!.a).toBeCloseTo(0.5, 5);
    });

    it('tolerates extra whitespace around the slash and values', () => {
      expect(parseRgbaString('rgb( 10   20   30  /  0.5 )')).toEqual({
        r: 10,
        g: 20,
        b: 30,
        a: 0.5,
      });
    });

    it('rejects mixing numbers and percentages among r/g/b in whitespace syntax', () => {
      expect(parseRgbaString('rgb(255 50% 0)')).toBeNull();
    });

    it('rejects mixing comma syntax with a slash alpha', () => {
      expect(parseRgbaString('rgb(255, 0, 0 / 0.5)')).toBeNull();
    });

    it('rejects mixing whitespace syntax with a comma alpha', () => {
      expect(parseRgbaString('rgb(255 0 0, 0.5)')).toBeNull();
    });
  });

  describe('clamping of out-of-range values', () => {
    it('clamps negative channel values to 0', () => {
      const result = parseRgbaString('rgb(-10, -20, -30)');
      expect(result).not.toBeNull();
      expect(result!.r).toBe(0);
      expect(result!.g).toBe(0);
      expect(result!.b).toBe(0);
    });

    it('clamps channel values above 255 down to 255', () => {
      const result = parseRgbaString('rgb(300, 999, 256)');
      expect(result).not.toBeNull();
      expect(result!.r).toBe(255);
      expect(result!.g).toBe(255);
      expect(result!.b).toBe(255);
    });

    it('clamps alpha above 1 down to 1', () => {
      const result = parseRgbaString('rgba(0, 0, 0, 2)');
      expect(result).not.toBeNull();
      expect(result!.a).toBe(1);
    });

    it('clamps negative alpha up to 0', () => {
      const result = parseRgbaString('rgba(0, 0, 0, -1)');
      expect(result).not.toBeNull();
      expect(result!.a).toBe(0);
    });
  });

  describe('invalid input', () => {
    it('returns null for a completely unrelated string', () => {
      expect(parseRgbaString('notacolor')).toBeNull();
    });

    it('returns null for an empty string', () => {
      expect(parseRgbaString('')).toBeNull();
    });

    it('returns null when a channel is missing', () => {
      expect(parseRgbaString('rgb(255, 0)')).toBeNull();
    });

    it('returns null when there are too many components', () => {
      expect(parseRgbaString('rgb(255, 0, 0, 0, 0)')).toBeNull();
    });

    it('returns null for a hex color string', () => {
      expect(parseRgbaString('#ff0000')).toBeNull();
    });

    it('returns null for a named color string', () => {
      expect(parseRgbaString('red')).toBeNull();
    });

    it('returns null when missing the closing parenthesis', () => {
      expect(parseRgbaString('rgb(255, 0, 0')).toBeNull();
    });

    it('returns null when values are non-numeric', () => {
      expect(parseRgbaString('rgb(a, b, c)')).toBeNull();
    });

    it('returns null for an hsl() string', () => {
      expect(parseRgbaString('hsl(0, 100%, 50%)')).toBeNull();
    });

    it('returns null when there is extraneous trailing text', () => {
      expect(parseRgbaString('rgb(255, 0, 0) extra')).toBeNull();
    });
  });
});
