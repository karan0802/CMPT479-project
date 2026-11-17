import { describe, it, expect } from 'vitest';
import { friendlyFormatIBAN } from './ibantools';

describe('friendlyFormatIBAN', () => {
  it('formats a valid Dutch IBAN with default space separator', () => {
    expect(friendlyFormatIBAN('NL91ABNA0417164300')).toBe('NL91 ABNA 0417 1643 00');
  });

  it('formats a valid Dutch IBAN with a custom separator', () => {
    expect(friendlyFormatIBAN('NL91ABNA0417164300', '-')).toBe('NL91-ABNA-0417-1643-00');
  });

  it('removes existing spaces and dashes before reformatting', () => {
    expect(friendlyFormatIBAN('NL91 ABNA 0417 1643 00')).toBe('NL91 ABNA 0417 1643 00');
    expect(friendlyFormatIBAN('NL91-ABNA-0417-1643-00')).toBe('NL91 ABNA 0417 1643 00');
  });

  it('uppercases lowercase input before formatting', () => {
    expect(friendlyFormatIBAN('nl91abna0417164300')).toBe('NL91 ABNA 0417 1643 00');
  });

  it('formats an IBAN whose length is an exact multiple of 4', () => {
    expect(friendlyFormatIBAN('NL91ABNA0417164300'.slice(0, 16))).toBe('NL91 ABNA 0417 1643');
  });

  it('does not add a trailing separator when length is a multiple of 4', () => {
    const result = friendlyFormatIBAN('ABCD1234EFGH5678');
    expect(result).toBe('ABCD 1234 EFGH 5678');
    expect(result?.endsWith(' ')).toBe(false);
  });

  it('returns the input unchanged (just uppercased) when 4 characters or fewer', () => {
    expect(friendlyFormatIBAN('nl91')).toBe('NL91');
    expect(friendlyFormatIBAN('ab')).toBe('AB');
  });

  it('returns an empty string when given an empty string', () => {
    expect(friendlyFormatIBAN('')).toBe('');
  });

  it('uses a multi-character separator when provided', () => {
    expect(friendlyFormatIBAN('NL91ABNA0417164300', '--')).toBe('NL91--ABNA--0417--1643--00');
  });

  it('uses an empty string separator to effectively leave the IBAN electronic', () => {
    expect(friendlyFormatIBAN('NL91ABNA0417164300', '')).toBe('NL91ABNA0417164300');
  });

  it('treats a null separator the same as the default space separator', () => {
    // @ts-expect-error testing runtime behavior with null separator
    expect(friendlyFormatIBAN('NL91ABNA0417164300', null)).toBe('NL91 ABNA 0417 1643 00');
  });

  it('formats IBANs from multiple countries correctly', () => {
    expect(friendlyFormatIBAN('GB29NWBK60161331926819')).toBe('GB29 NWBK 6016 1331 9268 19');
    expect(friendlyFormatIBAN('DE89370400440532013000')).toBe('DE89 3704 0044 0532 0130 00');
    expect(friendlyFormatIBAN('FR1420041010050500013M02606')).toBe('FR14 2004 1010 0505 0001 3M02 606');
  });

  it('returns null when iban is undefined', () => {
    expect(friendlyFormatIBAN(undefined)).toBeNull();
  });

  it('returns null when iban is not a string (number)', () => {
    // @ts-expect-error testing runtime behavior with wrong type
    expect(friendlyFormatIBAN(12345)).toBeNull();
  });

  it('returns null when iban is not a string (object)', () => {
    // @ts-expect-error testing runtime behavior with wrong type
    expect(friendlyFormatIBAN({})).toBeNull();
  });

  it('returns null when iban is not a string (null)', () => {
    // @ts-expect-error testing runtime behavior with wrong type
    expect(friendlyFormatIBAN(null)).toBeNull();
  });

  it('returns null when iban is not a string even if separator is valid', () => {
    // @ts-expect-error testing runtime behavior with wrong type
    expect(friendlyFormatIBAN(undefined, '-')).toBeNull();
  });

  it('handles mixed case and whitespace together', () => {
    expect(friendlyFormatIBAN('nl91 abna 0417164300')).toBe('NL91 ABNA 0417 1643 00');
  });
});
