import { describe, it, expect } from 'vitest';

import { rgbaToHsva } from './hsv';

describe('rgbaToHsva', () => {
  it('converts pure red to hue 0, full saturation and value', () => {
    expect(rgbaToHsva({ r: 255, g: 0, b: 0, a: 1 })).toEqual({
      h: 0,
      s: 100,
      v: 100,
      a: 1,
    });
  });

  it('converts pure green to hue 120', () => {
    expect(rgbaToHsva({ r: 0, g: 255, b: 0, a: 1 })).toEqual({
      h: 120,
      s: 100,
      v: 100,
      a: 1,
    });
  });

  it('converts black to zero saturation and value', () => {
    expect(rgbaToHsva({ r: 0, g: 0, b: 0, a: 1 })).toEqual({
      h: 0,
      s: 0,
      v: 0,
      a: 1,
    });
  });

  it('wraps a negative hue delta into the 0-360 range', () => {
    expect(rgbaToHsva({ r: 255, g: 0, b: 255, a: 1 })).toEqual({
      h: 300,
      s: 100,
      v: 100,
      a: 1,
    });
  });
});
