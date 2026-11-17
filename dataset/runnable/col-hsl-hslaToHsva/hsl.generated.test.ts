import { describe, it, expect } from 'vitest';
import { hslaToHsva } from './hsl';

describe('hslaToHsva', () => {
  it('converts black (l = 0) regardless of saturation', () => {
    expect(hslaToHsva({ h: 0, s: 0, l: 0, a: 1 })).toEqual({ h: 0, s: 0, v: 0, a: 1 });
  });

  it('converts white (l = 100) regardless of saturation', () => {
    expect(hslaToHsva({ h: 0, s: 0, l: 100, a: 1 })).toEqual({ h: 0, s: 0, v: 100, a: 1 });
  });

  it('converts a fully desaturated mid gray (s = 0, l = 50)', () => {
    expect(hslaToHsva({ h: 0, s: 0, l: 50, a: 1 })).toEqual({ h: 0, s: 0, v: 50, a: 1 });
  });

  it('converts pure red (h = 0, s = 100, l = 50) to full saturation/value', () => {
    expect(hslaToHsva({ h: 0, s: 100, l: 50, a: 1 })).toEqual({ h: 0, s: 100, v: 100, a: 1 });
  });

  it('converts a fully saturated dark color (l < 50) to s = 100', () => {
    // factor = l / 100 = 0.25 -> s' = 100 * 0.25 = 25
    // s_out = (2 * 25) / (25 + 25) * 100 = 100
    // v = l + s' = 25 + 25 = 50
    expect(hslaToHsva({ h: 90, s: 100, l: 25, a: 1 })).toEqual({ h: 90, s: 100, v: 50, a: 1 });
  });

  it('computes exact values for a light color (l > 50)', () => {
    // factor = (100 - l) / 100 = 0.4 -> s' = 60 * 0.4 = 24
    // s_out = (2 * 24) / (40 + 24) * 100 = 75
    // v = l + s' = 40 + 24 = 64
    expect(hslaToHsva({ h: 270, s: 60, l: 40, a: 0.75 })).toEqual({
      h: 270,
      s: 75,
      v: 64,
      a: 0.75,
    });
  });

  it('computes exact values for another light color (l > 50)', () => {
    // factor = (100 - 60) / 100 = 0.4 -> s' = 50 * 0.4 = 20
    // s_out = (2 * 20) / (60 + 20) * 100 = 50
    // v = l + s' = 60 + 20 = 80
    expect(hslaToHsva({ h: 200, s: 50, l: 60, a: 0.3 })).toEqual({
      h: 200,
      s: 50,
      v: 80,
      a: 0.3,
    });
  });

  it('handles the boundary case l = 50 using the (100 - l) branch', () => {
    // At l = 50, `l < 50` is false, so factor = (100 - 50) / 100 = 0.5
    // s' = 40 * 0.5 = 20
    // s_out = (2 * 20) / (50 + 20) * 100 = 400 / 7
    // v = l + s' = 50 + 20 = 70
    const result = hslaToHsva({ h: 10, s: 40, l: 50, a: 1 });
    expect(result.h).toBe(10);
    expect(result.v).toBe(70);
    expect(result.a).toBe(1);
    expect(result.s).toBeCloseTo(400 / 7, 10);
  });

  it('passes through an out-of-range (negative) hue unchanged', () => {
    const result = hslaToHsva({ h: -30, s: 50, l: 60, a: 1 });
    expect(result.h).toBe(-30);
    expect(result.s).toBe(50);
    expect(result.v).toBe(80);
    expect(result.a).toBe(1);
  });

  it('passes through an out-of-range (> 360) hue unchanged', () => {
    const result = hslaToHsva({ h: 400, s: 50, l: 60, a: 1 });
    expect(result.h).toBe(400);
    expect(result.s).toBe(50);
    expect(result.v).toBe(80);
    expect(result.a).toBe(1);
  });

  it('passes through the alpha value unchanged', () => {
    expect(hslaToHsva({ h: 150, s: 30, l: 45, a: 0.123 }).a).toBe(0.123);
    expect(hslaToHsva({ h: 150, s: 30, l: 45, a: 0 }).a).toBe(0);
  });

  it('does not mutate the input object', () => {
    const input = { h: 200, s: 50, l: 60, a: 0.3 };
    const snapshot = { ...input };
    hslaToHsva(input);
    expect(input).toEqual(snapshot);
  });

  it('returns s = 0 whenever the scaled saturation is 0, even with nonzero hue/lightness', () => {
    const result = hslaToHsva({ h: 123, s: 0, l: 77, a: 1 });
    expect(result.s).toBe(0);
    expect(result.v).toBe(77);
  });
});
