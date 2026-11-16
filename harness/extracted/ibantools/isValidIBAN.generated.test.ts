import { describe, it, expect } from 'vitest';

import { isValidIBAN } from './ibantools';

describe('isValidIBAN', () => {
  it('accepts a valid Dutch IBAN', () => {
    expect(isValidIBAN('NL91ABNA0417164300')).toBe(true);
  });

  it('rejects an IBAN with a bad checksum', () => {
    expect(isValidIBAN('NL92ABNA0517164300')).toBe(false);
  });

  it('accepts a valid Swiss QR-IBAN by default', () => {
    expect(isValidIBAN('CH4431999123000889012')).toBe(true);
  });

  it('rejects a QR-IBAN when QR-IBANs are disallowed', () => {
    expect(isValidIBAN('CH4431999123000889012', { allowQRIBAN: false })).toBe(false);
  });

  it('rejects null and undefined', () => {
    expect(isValidIBAN(null as unknown as string)).toBe(false);
    expect(isValidIBAN(undefined as unknown as string)).toBe(false);
  });

  it('rejects an unknown country code', () => {
    expect(isValidIBAN('ZZ91ABNA0417164300')).toBe(false);
  });
});
