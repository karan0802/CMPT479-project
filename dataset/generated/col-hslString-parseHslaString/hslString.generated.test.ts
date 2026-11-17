import { describe, it, expect } from 'vitest';
import { parseHslaString } from './hslString';

describe('parseHslaString', () => {
  describe('comma-separated functional syntax', () => {
    it('parses primary hues at full saturation and 50% lightness', () => {
      expect(parseHslaString('hsl(0, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
      expect(parseHslaString('hsl(60, 100%, 50%)')).toEqual({ r: 255, g: 255, b: 0, a: 1 });
      expect(parseHslaString('hsl(120, 100%, 50%)')).toEqual({ r: 0, g: 255, b: 0, a: 1 });
      expect(parseHslaString('hsl(180, 100%, 50%)')).toEqual({ r: 0, g: 255, b: 255, a: 1 });
      expect(parseHslaString('hsl(240, 100%, 50%)')).toEqual({ r: 0, g: 0, b: 255, a: 1 });
      expect(parseHslaString('hsl(300, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 255, a: 1 });
    });

    it('parses the classic dark CSS keyword colors at 25% lightness', () => {
      expect(parseHslaString('hsl(0, 100%, 25%)')).toEqual({ r: 128, g: 0, b: 0, a: 1 }); // maroon
      expect(parseHslaString('hsl(60, 100%, 25%)')).toEqual({ r: 128, g: 128, b: 0, a: 1 }); // olive
      expect(parseHslaString('hsl(120, 100%, 25%)')).toEqual({ r: 0, g: 128, b: 0, a: 1 }); // green
      expect(parseHslaString('hsl(180, 100%, 25%)')).toEqual({ r: 0, g: 128, b: 128, a: 1 }); // teal
      expect(parseHslaString('hsl(240, 100%, 25%)')).toEqual({ r: 0, g: 0, b: 128, a: 1 }); // navy
      expect(parseHslaString('hsl(300, 100%, 25%)')).toEqual({ r: 128, g: 0, b: 128, a: 1 }); // purple
    });

    it('parses black, white and gray', () => {
      expect(parseHslaString('hsl(0, 0%, 0%)')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
      expect(parseHslaString('hsl(123, 45%, 0%)')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
      expect(parseHslaString('hsl(0, 0%, 100%)')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
      expect(parseHslaString('hsl(0, 0%, 50%)')).toEqual({ r: 128, g: 128, b: 128, a: 1 });
    });

    it('parses alpha as a plain number', () => {
      expect(parseHslaString('hsla(0, 100%, 50%, 0.5)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
      expect(parseHslaString('hsla(0, 100%, 50%, 1)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
      expect(parseHslaString('hsla(0, 100%, 50%, 0)')).toEqual({ r: 255, g: 0, b: 0, a: 0 });
    });

    it('parses alpha expressed as a percentage', () => {
      expect(parseHslaString('hsla(0, 100%, 50%, 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
      expect(parseHslaString('hsla(0, 100%, 50%, 100%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    });

    it('allows an alpha value on the "hsl" function name (not just "hsla")', () => {
      expect(parseHslaString('hsl(0, 100%, 50%, 0.5)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
    });

    it('tolerates extra internal whitespace', () => {
      expect(parseHslaString('hsl( 0 , 100% , 50% )')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
      expect(parseHslaString('hsla(  0  ,  100%  ,  50%  ,  0.5  )')).toEqual({
        r: 255,
        g: 0,
        b: 0,
        a: 0.5,
      });
    });

    it('is case-insensitive', () => {
      expect(parseHslaString('HSL(0, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
      expect(parseHslaString('HSLA(0, 100%, 50%, 0.5)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
      expect(parseHslaString('Hsl(120, 100%, 50%)')).toEqual({ r: 0, g: 255, b: 0, a: 1 });
    });

    it('accepts decimal values that resolve to a clean color', () => {
      expect(parseHslaString('hsl(120.0, 100.0%, 50.0%)')).toEqual({ r: 0, g: 255, b: 0, a: 1 });
    });
  });

  describe('whitespace (slash) functional syntax', () => {
    it('parses hue/saturation/lightness separated by spaces', () => {
      expect(parseHslaString('hsl(0 100% 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
      expect(parseHslaString('hsl(120 100% 50%)')).toEqual({ r: 0, g: 255, b: 0, a: 1 });
      expect(parseHslaString('HSL(240 100% 50%)')).toEqual({ r: 0, g: 0, b: 255, a: 1 });
    });

    it('parses an alpha value after a slash as a plain number', () => {
      expect(parseHslaString('hsl(0 100% 50% / 0.5)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
    });

    it('parses an alpha value after a slash as a percentage', () => {
      expect(parseHslaString('hsl(0 100% 50% / 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
    });

    it('tolerates extra internal whitespace', () => {
      expect(parseHslaString('hsl(  0   100%   50%   /   0.5  )')).toEqual({
        r: 255,
        g: 0,
        b: 0,
        a: 0.5,
      });
    });
  });

  describe('hue units', () => {
    it('treats a bare number as degrees', () => {
      expect(parseHslaString('hsl(90, 100%, 50%)')).toEqual({ r: 128, g: 255, b: 0, a: 1 });
    });

    it('converts an explicit "deg" unit the same as a bare number', () => {
      expect(parseHslaString('hsl(90deg, 100%, 50%)')).toEqual({ r: 128, g: 255, b: 0, a: 1 });
    });

    it('converts "grad" units to degrees (400grad = 360deg)', () => {
      expect(parseHslaString('hsl(100grad, 100%, 50%)')).toEqual({ r: 128, g: 255, b: 0, a: 1 });
    });

    it('converts "turn" units to degrees (1turn = 360deg)', () => {
      expect(parseHslaString('hsl(0.25turn, 100%, 50%)')).toEqual({ r: 128, g: 255, b: 0, a: 1 });
    });

    it('converts "rad" units to degrees (pi/2 rad = 90deg)', () => {
      expect(parseHslaString('hsl(1.5707963267948966rad, 100%, 50%)')).toEqual({
        r: 128,
        g: 255,
        b: 0,
        a: 1,
      });
    });
  });

  describe('clamping and wrapping of out-of-range values', () => {
    it('wraps a hue greater than 360 degrees', () => {
      expect(parseHslaString('hsl(480, 100%, 50%)')).toEqual(parseHslaString('hsl(120, 100%, 50%)'));
    });

    it('wraps a negative hue', () => {
      expect(parseHslaString('hsl(-120, 100%, 50%)')).toEqual(parseHslaString('hsl(240, 100%, 50%)'));
    });

    it('clamps saturation above 100% down to 100%', () => {
      expect(parseHslaString('hsl(0, 150%, 50%)')).toEqual(parseHslaString('hsl(0, 100%, 50%)'));
    });

    it('clamps negative saturation up to 0%', () => {
      expect(parseHslaString('hsl(0, -50%, 50%)')).toEqual(parseHslaString('hsl(0, 0%, 50%)'));
    });

    it('clamps lightness above 100% down to 100%', () => {
      expect(parseHslaString('hsl(0, 100%, 150%)')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    });

    it('clamps negative lightness up to 0%', () => {
      expect(parseHslaString('hsl(0, 100%, -50%)')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    });

    it('clamps alpha above 1 down to 1', () => {
      expect(parseHslaString('hsla(0, 100%, 50%, 2)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    });

    it('clamps negative alpha up to 0', () => {
      expect(parseHslaString('hsla(0, 100%, 50%, -1)')).toEqual({ r: 255, g: 0, b: 0, a: 0 });
    });
  });

  describe('invalid input', () => {
    it('returns null for an empty string', () => {
      expect(parseHslaString('')).toBeNull();
    });

    it('returns null when the saturation is missing its percent sign', () => {
      expect(parseHslaString('hsl(0, 100, 50%)')).toBeNull();
    });

    it('returns null when the lightness is missing its percent sign', () => {
      expect(parseHslaString('hsl(0, 100%, 50)')).toBeNull();
    });

    it('returns null for a missing closing parenthesis', () => {
      expect(parseHslaString('hsl(0, 100%, 50%')).toBeNull();
    });

    it('returns null for a trailing comma with no alpha value', () => {
      expect(parseHslaString('hsl(0, 100%, 50%,)')).toBeNull();
    });

    it('returns null for an alpha value with an invalid unit', () => {
      expect(parseHslaString('hsla(0, 100%, 50%, 1.5turn)')).toBeNull();
    });

    it('returns null when mixing comma and space separators', () => {
      expect(parseHslaString('hsl(0, 100% 50%)')).toBeNull();
    });

    it('returns null for a completely different color function', () => {
      expect(parseHslaString('rgb(255, 0, 0)')).toBeNull();
    });

    it('returns null for a non-numeric hue', () => {
      expect(parseHslaString('hsl(nan, 100%, 50%)')).toBeNull();
    });

    it('returns null when there is leading or trailing whitespace outside the parentheses', () => {
      expect(parseHslaString(' hsl(0, 100%, 50%)')).toBeNull();
      expect(parseHslaString('hsl(0, 100%, 50%) ')).toBeNull();
    });

    it('returns null for plain text', () => {
      expect(parseHslaString('red')).toBeNull();
    });
  });
});
