import { describe, it, expect } from 'vitest';
import { parseRgba } from './rgb';

describe('parseRgba', () => {
  it('parses a fully specified rgba object', () => {
    expect(parseRgba({ r: 255, g: 0, b: 0, a: 1 })).toEqual({
      r: 255,
      g: 0,
      b: 0,
      a: 1,
    });
  });

  it('defaults alpha to 1 when not provided', () => {
    expect(parseRgba({ r: 10, g: 20, b: 30 })).toEqual({
      r: 10,
      g: 20,
      b: 30,
      a: 1,
    });
  });

  it('coerces numeric string channel values to numbers', () => {
    expect(parseRgba({ r: '100', g: '50', b: '25', a: '0.5' })).toEqual({
      r: 100,
      g: 50,
      b: 25,
      a: 0.5,
    });
  });

  it('clamps r, g, b values above 255 down to 255', () => {
    expect(parseRgba({ r: 300, g: 999, b: 256, a: 1 })).toEqual({
      r: 255,
      g: 255,
      b: 255,
      a: 1,
    });
  });

  it('clamps r, g, b values below 0 up to 0', () => {
    expect(parseRgba({ r: -10, g: -1, b: -255, a: 1 })).toEqual({
      r: 0,
      g: 0,
      b: 0,
      a: 1,
    });
  });

  it('clamps alpha values above 1 down to 1', () => {
    expect(parseRgba({ r: 0, g: 0, b: 0, a: 5 })).toEqual({
      r: 0,
      g: 0,
      b: 0,
      a: 1,
    });
  });

  it('clamps alpha values below 0 up to 0', () => {
    expect(parseRgba({ r: 0, g: 0, b: 0, a: -5 })).toEqual({
      r: 0,
      g: 0,
      b: 0,
      a: 0,
    });
  });

  it('preserves in-range values without alteration', () => {
    expect(parseRgba({ r: 0, g: 128, b: 255, a: 0 })).toEqual({
      r: 0,
      g: 128,
      b: 255,
      a: 0,
    });
  });

  it('returns null when r is missing', () => {
    expect(parseRgba({ g: 1, b: 1 } as any)).toBeNull();
  });

  it('returns null when g is missing', () => {
    expect(parseRgba({ r: 1, b: 1 } as any)).toBeNull();
  });

  it('returns null when b is missing', () => {
    expect(parseRgba({ r: 1, g: 1 } as any)).toBeNull();
  });

  it('returns null when r, g, and b are all missing', () => {
    expect(parseRgba({} as any)).toBeNull();
  });

  it('returns null when r is undefined', () => {
    expect(parseRgba({ r: undefined, g: 1, b: 1 } as any)).toBeNull();
  });

  it('returns null when r is null', () => {
    expect(parseRgba({ r: null, g: 1, b: 1 } as any)).toBeNull();
  });

  it('returns null when g is null', () => {
    expect(parseRgba({ r: 1, g: null, b: 1 } as any)).toBeNull();
  });

  it('returns null when b is null', () => {
    expect(parseRgba({ r: 1, g: 1, b: null } as any)).toBeNull();
  });

  it('treats a channel value of 0 as present (does not return null)', () => {
    expect(parseRgba({ r: 0, g: 0, b: 0 })).toEqual({
      r: 0,
      g: 0,
      b: 0,
      a: 1,
    });
  });

  it('ignores extraneous properties on the input object', () => {
    expect(
      parseRgba({ r: 1, g: 2, b: 3, a: 1, extra: 'ignored' } as any)
    ).toEqual({ r: 1, g: 2, b: 3, a: 1 });
  });
});
