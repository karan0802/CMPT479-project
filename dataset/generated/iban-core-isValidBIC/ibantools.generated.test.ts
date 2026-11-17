import { describe, it, expect } from 'vitest';
import { isValidBIC } from './ibantools';

describe('isValidBIC', () => {
  it('returns true for a valid 8-character BIC with a known country code', () => {
    expect(isValidBIC('ABNANL2A')).toBe(true);
  });

  it('returns true for a valid 11-character BIC with a known country code', () => {
    expect(isValidBIC('NEDSZAJJXXX')).toBe(true);
  });

  it('returns true for a valid 8-character BIC in Germany', () => {
    expect(isValidBIC('DEUTDEFF')).toBe(true);
  });

  it('returns true for a valid 11-character BIC in Great Britain', () => {
    expect(isValidBIC('BARCGB22XXX')).toBe(true);
  });

  it('returns true for a lowercase BIC that matches the regex and resolves to a known country', () => {
    expect(isValidBIC('abnanl2a')).toBe(true);
  });

  it('returns true for a mixed-case BIC with a numeric branch code', () => {
    expect(isValidBIC('DEUTDEFF500')).toBe(true);
  });

  it('returns false when there are digits in the bank code section', () => {
    expect(isValidBIC('ABN4NL2A')).toBe(false);
  });

  it('returns false when the BIC contains spaces', () => {
    expect(isValidBIC('ABNA NL 2A')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isValidBIC('')).toBe(false);
  });

  it('returns false for undefined-like falsy input cast as string', () => {
    expect(isValidBIC(undefined as unknown as string)).toBe(false);
  });

  it('returns false for null input', () => {
    expect(isValidBIC(null as unknown as string)).toBe(false);
  });

  it('returns false when the BIC is too short (7 characters)', () => {
    expect(isValidBIC('ABNANL2')).toBe(false);
  });

  it('returns false when the BIC has 9 characters (invalid length)', () => {
    expect(isValidBIC('ABNANL2AX')).toBe(false);
  });

  it('returns false when the BIC has 10 characters (invalid length)', () => {
    expect(isValidBIC('ABNANL2AXX')).toBe(false);
  });

  it('returns false when the BIC has 12 characters (invalid length)', () => {
    expect(isValidBIC('ABNANL2AXXXX')).toBe(false);
  });

  it('returns false when the country code segment does not exist in countrySpecs', () => {
    expect(isValidBIC('ABNAZZ2A')).toBe(false);
  });

  it('returns false when the format is correct but the country code is unknown even with a branch code', () => {
    expect(isValidBIC('ABNAZZ2AXXX')).toBe(false);
  });

  it('returns false when the bank code section contains non-alphabetic characters', () => {
    expect(isValidBIC('AB1ANL2A')).toBe(false);
  });

  it('returns false when the BIC contains a hyphen', () => {
    expect(isValidBIC('ABNA-NL2A')).toBe(false);
  });

  it('returns true for a BIC resolving to Norway', () => {
    expect(isValidBIC('DNBANOKK')).toBe(true);
  });

  it('returns true for a BIC resolving to Belgium', () => {
    expect(isValidBIC('GEBABEBB')).toBe(true);
  });

  it('returns true for a BIC resolving to Switzerland', () => {
    expect(isValidBIC('UBSWCHZH')).toBe(true);
  });

  it('returns true for a BIC resolving to Liechtenstein', () => {
    expect(isValidBIC('BFRILI22')).toBe(true);
  });

  it('is case-insensitive when resolving the country code for validity', () => {
    expect(isValidBIC('deutdeff')).toBe(true);
    expect(isValidBIC('DeutDeFF')).toBe(true);
  });
});
