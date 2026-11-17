import { describe, it, expect } from 'vitest';
import { parseHex } from './hex';

describe('parseHex', () => {
  it('parses a 6-digit hex string without alpha', () => {
    expect(parseHex('#ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseHex('#00ff00')).toEqual({ r: 0, g: 255, b: 0, a: 1 });
    expect(parseHex('#0000ff')).toEqual({ r: 0, g: 0, b: 255, a: 1 });
  });

  it('parses a 6-digit hex string case-insensitively', () => {
    expect(parseHex('#FF0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseHex('#AaBbCc')).toEqual({ r: 170, g: 187, b: 204, a: 1 });
  });

  it('parses an 8-digit hex string with alpha', () => {
    expect(parseHex('#ff000080')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
    expect(parseHex('#000000ff')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(parseHex('#00000000')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it('parses a 3-digit hex string without alpha, duplicating each digit', () => {
    expect(parseHex('#f00')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseHex('#0f0')).toEqual({ r: 0, g: 255, b: 0, a: 1 });
    expect(parseHex('#00f')).toEqual({ r: 0, g: 0, b: 255, a: 1 });
    expect(parseHex('#abc')).toEqual({ r: 170, g: 187, b: 204, a: 1 });
  });

  it('parses a 4-digit hex string with alpha, duplicating each digit', () => {
    expect(parseHex('#f00f')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseHex('#f000')).toEqual({ r: 255, g: 0, b: 0, a: 0 });
    expect(parseHex('#0000')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it('rounds the alpha channel to 2 decimal places', () => {
    const result3 = parseHex('#0001');
    expect(result3).not.toBeNull();
    expect(result3!.a).toBeCloseTo(0.07, 2);

    const result8 = parseHex('#00000001');
    expect(result8).not.toBeNull();
    expect(result8!.a).toBeCloseTo(0, 2);

    const result8b = parseHex('#0000007f');
    expect(result8b).not.toBeNull();
    expect(result8b!.a).toBeCloseTo(0.5, 2);
  });

  it('returns null for strings without a leading #', () => {
    expect(parseHex('ff0000')).toBeNull();
    expect(parseHex('fff')).toBeNull();
  });

  it('returns null for invalid lengths', () => {
    expect(parseHex('#f')).toBeNull();
    expect(parseHex('#ff')).toBeNull();
    expect(parseHex('#fffff')).toBeNull();
    expect(parseHex('#fffffff')).toBeNull();
    expect(parseHex('#fffffffff')).toBeNull();
  });

  it('returns null for strings containing non-hex characters', () => {
    expect(parseHex('#gggggg')).toBeNull();
    expect(parseHex('#xyz')).toBeNull();
    expect(parseHex('#12345z')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseHex('')).toBeNull();
  });

  it('returns null for a string with only a hash', () => {
    expect(parseHex('#')).toBeNull();
  });

  it('returns null for strings with whitespace', () => {
    expect(parseHex(' #fff')).toBeNull();
    expect(parseHex('#fff ')).toBeNull();
    expect(parseHex('# fff')).toBeNull();
  });

  it('returns null for named colors or other formats', () => {
    expect(parseHex('red')).toBeNull();
    expect(parseHex('rgb(255, 0, 0)')).toBeNull();
  });

  it('parses black and white correctly in all supported lengths', () => {
    expect(parseHex('#000')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseHex('#000000')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(parseHex('#ffffff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });
});
