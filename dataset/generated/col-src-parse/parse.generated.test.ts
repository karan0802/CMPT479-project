import { describe, it, expect } from 'vitest';
import { parse, getFormat } from './parse';

describe('parse', () => {
  describe('invalid / unsupported inputs', () => {
    it('returns [null, undefined] for null', () => {
      expect(parse(null as any)).toEqual([null, undefined]);
    });

    it('returns [null, undefined] for undefined', () => {
      expect(parse(undefined as any)).toEqual([null, undefined]);
    });

    it('returns [null, undefined] for a number', () => {
      expect(parse(123 as any)).toEqual([null, undefined]);
    });

    it('returns [null, undefined] for a boolean', () => {
      expect(parse(true as any)).toEqual([null, undefined]);
    });

    it('returns [null, undefined] for an empty string', () => {
      expect(parse('')).toEqual([null, undefined]);
    });

    it('returns [null, undefined] for a whitespace-only string', () => {
      expect(parse('   ')).toEqual([null, undefined]);
    });

    it('returns [null, undefined] for a garbage string', () => {
      expect(parse('not-a-color')).toEqual([null, undefined]);
    });

    it('returns [null, undefined] for an empty object', () => {
      expect(parse({} as any)).toEqual([null, undefined]);
    });

    it('returns [null, undefined] for an array', () => {
      expect(parse([255, 0, 0] as any)).toEqual([null, undefined]);
    });

    it('returns [null, undefined] for an object missing required rgb/hsl/hsv keys', () => {
      expect(parse({ foo: 1 } as any)).toEqual([null, undefined]);
    });

    it('returns [null, undefined] for an incomplete rgb object', () => {
      expect(parse({ r: 255, g: 0 } as any)).toEqual([null, undefined]);
    });

    it('returns [null, undefined] for an invalid hex string', () => {
      expect(parse('#zzzzzz')).toEqual([null, undefined]);
    });

    it('returns [null, undefined] for a hex string with wrong length', () => {
      expect(parse('#12')).toEqual([null, undefined]);
    });
  });

  describe('hex strings', () => {
    it('parses a 6-digit hex color', () => {
      expect(parse('#ff0000')).toEqual([{ r: 255, g: 0, b: 0, a: 1 }, 'hex']);
    });

    it('is case-insensitive', () => {
      expect(parse('#FF0000')).toEqual([{ r: 255, g: 0, b: 0, a: 1 }, 'hex']);
    });

    it('parses a 3-digit shorthand hex color', () => {
      expect(parse('#f00')).toEqual([{ r: 255, g: 0, b: 0, a: 1 }, 'hex']);
    });

    it('parses an 8-digit hex color with alpha', () => {
      expect(parse('#ff000000')).toEqual([{ r: 255, g: 0, b: 0, a: 0 }, 'hex']);
      expect(parse('#ff0000ff')).toEqual([{ r: 255, g: 0, b: 0, a: 1 }, 'hex']);
    });

    it('parses a 4-digit shorthand hex color with alpha', () => {
      expect(parse('#f00f')).toEqual([{ r: 255, g: 0, b: 0, a: 1 }, 'hex']);
    });

    it('trims surrounding whitespace before parsing', () => {
      expect(parse('  #ff0000  ')).toEqual(parse('#ff0000'));
    });

    it('parses black and white', () => {
      expect(parse('#000000')).toEqual([{ r: 0, g: 0, b: 0, a: 1 }, 'hex']);
      expect(parse('#ffffff')).toEqual([{ r: 255, g: 255, b: 255, a: 1 }, 'hex']);
    });
  });

  describe('rgb strings', () => {
    it('parses an rgb() string', () => {
      expect(parse('rgb(255, 0, 0)')).toEqual([{ r: 255, g: 0, b: 0, a: 1 }, 'rgb']);
    });

    it('parses an rgba() string with alpha', () => {
      expect(parse('rgba(255, 0, 0, 0.5)')).toEqual([{ r: 255, g: 0, b: 0, a: 0.5 }, 'rgb']);
    });

    it('parses rgb strings for green and blue', () => {
      expect(parse('rgb(0, 255, 0)')).toEqual([{ r: 0, g: 255, b: 0, a: 1 }, 'rgb']);
      expect(parse('rgb(0, 0, 255)')).toEqual([{ r: 0, g: 0, b: 255, a: 1 }, 'rgb']);
    });
  });

  describe('hsl strings', () => {
    it('parses an hsl() string for pure red', () => {
      expect(parse('hsl(0, 100%, 50%)')).toEqual([{ r: 255, g: 0, b: 0, a: 1 }, 'hsl']);
    });

    it('parses an hsla() string with alpha for pure green', () => {
      expect(parse('hsla(120, 100%, 50%, 0.5)')).toEqual([{ r: 0, g: 255, b: 0, a: 0.5 }, 'hsl']);
    });

    it('parses pure blue', () => {
      expect(parse('hsl(240, 100%, 50%)')).toEqual([{ r: 0, g: 0, b: 255, a: 1 }, 'hsl']);
    });

    it('parses white and black via lightness', () => {
      expect(parse('hsl(0, 0%, 100%)')).toEqual([{ r: 255, g: 255, b: 255, a: 1 }, 'hsl']);
      expect(parse('hsl(0, 0%, 0%)')).toEqual([{ r: 0, g: 0, b: 0, a: 1 }, 'hsl']);
    });
  });

  describe('rgb objects', () => {
    it('parses a complete rgba object', () => {
      expect(parse({ r: 255, g: 0, b: 0, a: 1 })).toEqual([{ r: 255, g: 0, b: 0, a: 1 }, 'rgb']);
    });

    it('defaults alpha to 1 when omitted', () => {
      const [result, format] = parse({ r: 10, g: 20, b: 30 } as any);
      expect(format).toBe('rgb');
      expect(result).toMatchObject({ r: 10, g: 20, b: 30 });
      expect((result as any).a).toBe(1);
    });
  });

  describe('hsl objects', () => {
    it('parses a complete hsla object for pure red', () => {
      expect(parse({ h: 0, s: 100, l: 50, a: 1 })).toEqual([{ r: 255, g: 0, b: 0, a: 1 }, 'hsl']);
    });

    it('parses a complete hsla object for pure green with alpha', () => {
      expect(parse({ h: 120, s: 100, l: 50, a: 0.5 })).toEqual([{ r: 0, g: 255, b: 0, a: 0.5 }, 'hsl']);
    });
  });

  describe('hsv objects', () => {
    it('parses a complete hsva object for pure red', () => {
      expect(parse({ h: 0, s: 100, v: 100, a: 1 })).toEqual([{ r: 255, g: 0, b: 0, a: 1 }, 'hsv']);
    });

    it('parses a complete hsva object for pure blue with alpha', () => {
      expect(parse({ h: 240, s: 100, v: 100, a: 0.5 })).toEqual([{ r: 0, g: 0, b: 255, a: 0.5 }, 'hsv']);
    });
  });

  describe('parser precedence for strings', () => {
    it('tries hex before rgb and hsl string parsers', () => {
      const [, format] = parse('#ff0000');
      expect(format).toBe('hex');
    });
  });
});

describe('getFormat', () => {
  it('returns "hex" for a hex string', () => {
    expect(getFormat('#fff')).toBe('hex');
  });

  it('returns "rgb" for an rgb string', () => {
    expect(getFormat('rgb(0, 0, 0)')).toBe('rgb');
  });

  it('returns "hsl" for an hsl object', () => {
    expect(getFormat({ h: 0, s: 0, l: 0, a: 1 })).toBe('hsl');
  });

  it('returns "hsv" for an hsv object', () => {
    expect(getFormat({ h: 0, s: 0, v: 0, a: 1 })).toBe('hsv');
  });

  it('returns undefined for invalid input', () => {
    expect(getFormat(123 as any)).toBeUndefined();
    expect(getFormat('not-a-color')).toBeUndefined();
  });
});
