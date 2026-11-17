import { describe, it, expect } from 'vitest';
import { isQRIBAN } from './ibantools';

describe('isQRIBAN', () => {
  it('returns true for a valid Swiss QR-IBAN', () => {
    expect(isQRIBAN('CH4431999123000889012')).toBe(true);
  });

  it('returns false for a regular (non-QR) Dutch IBAN', () => {
    expect(isQRIBAN('NL92ABNA0517164300')).toBe(false);
  });

  it('returns false for a regular (non-QR) Swiss IBAN', () => {
    // IID segment 00000, not in the QR range 30000-31999
    expect(isQRIBAN('CH9300762011623852957')).toBe(false);
  });

  it('returns true for a Liechtenstein IBAN with a QR IID', () => {
    expect(isQRIBAN('LI21300123000889012XX')).toBe(true);
  });

  it('returns false for a Liechtenstein IBAN with a non-QR IID', () => {
    expect(isQRIBAN('LI21088110001234567X9')).toBe(false);
  });

  it('returns false for a country not in the QR-IBAN list, even with digits in the QR range', () => {
    expect(isQRIBAN('DE44310000123000889012')).toBe(false);
  });

  it('returns true at the lower boundary of the QR IID range (30000)', () => {
    expect(isQRIBAN('CH0030000123000889012')).toBe(true);
  });

  it('returns true at the upper boundary of the QR IID range (31999)', () => {
    expect(isQRIBAN('CH0031999123000889012')).toBe(true);
  });

  it('returns false just below the QR IID range (29999)', () => {
    expect(isQRIBAN('CH0029999123000889012')).toBe(false);
  });

  it('returns false just above the QR IID range (32000)', () => {
    expect(isQRIBAN('CH0032000123000889012')).toBe(false);
  });

  it('returns false when the IID segment contains non-digit characters', () => {
    expect(isQRIBAN('CH003A999123000889012')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isQRIBAN('')).toBe(false);
  });

  it('returns false for null input', () => {
    // @ts-expect-error testing runtime guard against null input
    expect(isQRIBAN(null)).toBe(false);
  });

  it('returns false for undefined input', () => {
    // @ts-expect-error testing runtime guard against undefined input
    expect(isQRIBAN(undefined)).toBe(false);
  });

  it('returns false when the IBAN is too short to contain an IID segment', () => {
    expect(isQRIBAN('CH44319')).toBe(false);
  });

  it('is case-sensitive about the country code and rejects a lowercase match', () => {
    expect(isQRIBAN('ch4431999123000889012')).toBe(false);
  });
});
