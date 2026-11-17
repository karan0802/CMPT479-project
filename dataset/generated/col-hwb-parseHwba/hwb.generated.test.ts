import { describe, it, expect } from 'vitest';
import { parseHwba } from './hwb';

describe('parseHwba', () => {
  it('returns null when hue is missing', () => {
    expect(parseHwba({ w: 0, b: 0 })).toBeNull();
  });

  it('returns null when whiteness is missing', () => {
    expect(parseHwba({ h: 0, b: 0 })).toBeNull();
  });

  it('returns null when blackness is missing', () => {
    expect(parseHwba({ h: 0, w: 0 })).toBeNull();
  });

  it('returns null when hue is explicitly null', () => {
    expect(parseHwba({ h: null, w: 0, b: 0 })).toBeNull();
  });

  it('returns null when whiteness is explicitly undefined', () => {
    expect(parseHwba({ h: 0, w: undefined, b: 0 })).toBeNull();
  });

  it('treats a hue/whiteness/blackness of 0 as present (not missing)', () => {
    const result = parseHwba({ h: 0, w: 0, b: 0 });
    expect(result).not.toBeNull();
  });

  it('converts pure red (h=0, w=0, b=0) with default alpha', () => {
    expect(parseHwba({ h: 0, w: 0, b: 0 })).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('converts pure green (h=120, w=0, b=0)', () => {
    expect(parseHwba({ h: 120, w: 0, b: 0 })).toEqual({ r: 0, g: 255, b: 0, a: 1 });
  });

  it('converts pure blue (h=240, w=0, b=0)', () => {
    expect(parseHwba({ h: 240, w: 0, b: 0 })).toEqual({ r: 0, g: 0, b: 255, a: 1 });
  });

  it('converts pure yellow (h=60, w=0, b=0)', () => {
    expect(parseHwba({ h: 60, w: 0, b: 0 })).toEqual({ r: 255, g: 255, b: 0, a: 1 });
  });

  it('converts orange (h=40, w=0, b=0) with an exact fractional result', () => {
    expect(parseHwba({ h: 40, w: 0, b: 0 })).toEqual({ r: 255, g: 170, b: 0, a: 1 });
  });

  it('produces white when whiteness is 100, regardless of hue', () => {
    expect(parseHwba({ h: 200, w: 100, b: 0 })).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  it('produces black when blackness is 100, regardless of hue', () => {
    expect(parseHwba({ h: 90, w: 0, b: 100 })).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });

  it('produces mid gray when whiteness and blackness both equal 50', () => {
    expect(parseHwba({ h: 0, w: 50, b: 50 })).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });

  it('defaults alpha to 1 when alpha is omitted', () => {
    const result = parseHwba({ h: 120, w: 0, b: 0 });
    expect(result?.a).toBe(1);
  });

  it('respects an explicit alpha value within range', () => {
    expect(parseHwba({ h: 0, w: 0, b: 0, a: 0.5 })).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
  });

  it('clamps alpha above 1 down to 1', () => {
    expect(parseHwba({ h: 0, w: 0, b: 0, a: 2 })).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('clamps alpha below 0 up to 0', () => {
    expect(parseHwba({ h: 0, w: 0, b: 0, a: -1 })).toEqual({ r: 255, g: 0, b: 0, a: 0 });
  });

  it('clamps whiteness above 100 and blackness below 0, combined with alpha clamping', () => {
    expect(parseHwba({ h: 0, w: 150, b: -20, a: 2 })).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  it('wraps a hue greater than 360 via clampHue (400 behaves like 40)', () => {
    expect(parseHwba({ h: 400, w: 0, b: 0 })).toEqual({ r: 255, g: 170, b: 0, a: 1 });
  });

  it('wraps a negative hue via clampHue (-320 behaves like 40)', () => {
    expect(parseHwba({ h: -320, w: 0, b: 0 })).toEqual({ r: 255, g: 170, b: 0, a: 1 });
  });

  it('coerces numeric-looking string inputs to numbers', () => {
    expect(
      parseHwba({ h: '40' as unknown as number, w: '0' as unknown as number, b: '0' as unknown as number })
    ).toEqual({
      r: 255,
      g: 170,
      b: 0,
      a: 1,
    });
  });

  it('coerces a numeric-looking string alpha to a number', () => {
    expect(parseHwba({ h: 0, w: 0, b: 0, a: '0.5' as unknown as number })).toEqual({
      r: 255,
      g: 0,
      b: 0,
      a: 0.5,
    });
  });
});
