import { describe, it, expect } from 'vitest';
import { hsvaToHsla } from './hsl';

describe('hsvaToHsla', () => {
  it('converts black (s=0, v=0) to l=0, s=0', () => {
    const result = hsvaToHsla({ h: 0, s: 0, v: 0, a: 1 });
    expect(result).toEqual({ h: 0, s: 0, l: 0, a: 1 });
  });

  it('converts white (s=0, v=100) to l=100, s=0', () => {
    const result = hsvaToHsla({ h: 0, s: 0, v: 100, a: 1 });
    expect(result).toEqual({ h: 0, s: 0, l: 100, a: 1 });
  });

  it('converts a mid-gray (s=0, v=50) to l=50, s=0', () => {
    // hh = (200 - 0) * 50 / 100 = 100 -> falls on the hh<=100 boundary
    const result = hsvaToHsla({ h: 0, s: 0, v: 50, a: 1 });
    expect(result.s).toBe(0);
    expect(result.l).toBe(50);
  });

  it('converts fully saturated, full value color (s=100, v=100) to s=100, l=50', () => {
    // hh = (200 - 100) * 100 / 100 = 100
    const result = hsvaToHsla({ h: 240, s: 100, v: 100, a: 1 });
    expect(result.h).toBe(240);
    expect(result.s).toBeCloseTo(100, 10);
    expect(result.l).toBeCloseTo(50, 10);
    expect(result.a).toBe(1);
  });

  it('converts fully saturated green at half value (s=100, v=50) to s=100, l=25', () => {
    // hh = (200 - 100) * 50 / 100 = 50 (hh <= 100 branch)
    const result = hsvaToHsla({ h: 120, s: 100, v: 50, a: 1 });
    expect(result.h).toBe(120);
    expect(result.s).toBeCloseTo(100, 10);
    expect(result.l).toBeCloseTo(25, 10);
    expect(result.a).toBe(1);
  });

  it('uses the hh <= 100 branch for a moderately bright, low-saturation color', () => {
    // hh = (200 - 20) * 40 / 100 = 72 (hh <= 100)
    const result = hsvaToHsla({ h: 60, s: 20, v: 40, a: 1 });
    expect(result.l).toBeCloseTo(36, 10);
    // s = (20 * 40 / 100) / 72 * 100 = 8 / 72 * 100
    expect(result.s).toBeCloseTo((8 / 72) * 100, 10);
  });

  it('uses the hh > 100 branch (denominator becomes 200 - hh)', () => {
    // hh = (200 - 50) * 80 / 100 = 120 (hh > 100)
    const result = hsvaToHsla({ h: 10, s: 50, v: 80, a: 1 });
    expect(result.l).toBeCloseTo(60, 10);
    // s = (50 * 80 / 100) / (200 - 120) * 100 = 40 / 80 * 100 = 50
    expect(result.s).toBeCloseTo(50, 10);
  });

  it('matches a precise non-round example in the hh > 100 branch', () => {
    // hh = (200 - 20) * 90 / 100 = 162 (hh > 100)
    const result = hsvaToHsla({ h: 300, s: 20, v: 90, a: 0.5 });
    expect(result.h).toBe(300);
    expect(result.l).toBeCloseTo(81, 10);
    // s = (20 * 90 / 100) / (200 - 162) * 100 = 18 / 38 * 100
    expect(result.s).toBeCloseTo((18 / 38) * 100, 10);
    expect(result.a).toBe(0.5);
  });

  it('returns s=0 when hh equals 0 (v=0 regardless of s)', () => {
    const result = hsvaToHsla({ h: 90, s: 75, v: 0, a: 1 });
    expect(result.s).toBe(0);
    expect(result.l).toBe(0);
  });

  it('returns s=0 when hh equals 200 exactly (s=0, v=100)', () => {
    const result = hsvaToHsla({ h: 90, s: 0, v: 100, a: 1 });
    expect(result.s).toBe(0);
    expect(result.l).toBe(100);
  });

  it('returns s=0 when hh exceeds 200 (s negative, which is out of normal range)', () => {
    // hh = (200 - (-50)) * 100 / 100 = 250, which is not < 200
    const result = hsvaToHsla({ h: 45, s: -50, v: 100, a: 1 });
    expect(result.s).toBe(0);
    expect(result.l).toBe(125);
  });

  it('passes the hue through unchanged, including out-of-range values', () => {
    const result = hsvaToHsla({ h: 720, s: 0, v: 0, a: 1 });
    expect(result.h).toBe(720);

    const negativeHue = hsvaToHsla({ h: -45, s: 0, v: 0, a: 1 });
    expect(negativeHue.h).toBe(-45);
  });

  it('passes the alpha channel through unchanged', () => {
    const result = hsvaToHsla({ h: 0, s: 50, v: 50, a: 0.37 });
    expect(result.a).toBe(0.37);

    const zeroAlpha = hsvaToHsla({ h: 0, s: 50, v: 50, a: 0 });
    expect(zeroAlpha.a).toBe(0);
  });

  it('does not clamp s or v itself, leaving that responsibility to clampHsla', () => {
    // s=150 (out of normal 0-100 range) is used as-is in the formula
    // hh = (200 - 150) * 100 / 100 = 50
    const result = hsvaToHsla({ h: 0, s: 150, v: 100, a: 1 });
    expect(result.l).toBeCloseTo(25, 10);
    // s = (150 * 100 / 100) / 50 * 100 = 150 / 50 * 100 = 300
    expect(result.s).toBeCloseTo(300, 10);
  });

  it('is a pure function that does not mutate its input', () => {
    const input = { h: 200, s: 40, v: 60, a: 0.8 };
    const inputCopy = { ...input };
    hsvaToHsla(input);
    expect(input).toEqual(inputCopy);
  });
});
