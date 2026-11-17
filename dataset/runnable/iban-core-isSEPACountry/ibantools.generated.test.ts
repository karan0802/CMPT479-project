import { describe, it, expect } from 'vitest';
import { isSEPACountry } from './ibantools';

describe('isSEPACountry', () => {
  it('returns true for SEPA countries with SEPA: true', () => {
    expect(isSEPACountry('AT')).toBe(true);
    expect(isSEPACountry('BE')).toBe(true);
    expect(isSEPACountry('CH')).toBe(true);
    expect(isSEPACountry('DE')).toBe(true);
    expect(isSEPACountry('GB')).toBe(true);
    expect(isSEPACountry('LI')).toBe(true);
    expect(isSEPACountry('NL')).toBe(true);
    expect(isSEPACountry('NO')).toBe(true);
  });

  it('returns false for a country with an entry but no SEPA field (PK)', () => {
    expect(isSEPACountry('PK')).toBe(false);
  });

  it('returns false for a country code with no entry in the table at all', () => {
    expect(isSEPACountry('ZZ')).toBe(false);
    expect(isSEPACountry('XX')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isSEPACountry('')).toBe(false);
  });

  it('returns false for undefined', () => {
    // @ts-expect-error testing runtime guard against undefined input
    expect(isSEPACountry(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    // @ts-expect-error testing runtime guard against null input
    expect(isSEPACountry(null)).toBe(false);
  });

  it('is case sensitive and does not match lowercase country codes', () => {
    expect(isSEPACountry('nl')).toBe(false);
    expect(isSEPACountry('de')).toBe(false);
  });

  it('does not match codes that merely resemble valid entries (whitespace/partial)', () => {
    expect(isSEPACountry(' NL')).toBe(false);
    expect(isSEPACountry('NL ')).toBe(false);
    expect(isSEPACountry('N')).toBe(false);
    expect(isSEPACountry('NLD')).toBe(false);
  });

  it('returns false for prototype-polluting-looking keys (object has no own property for them)', () => {
    expect(isSEPACountry('toString')).toBe(false);
    expect(isSEPACountry('constructor')).toBe(false);
    expect(isSEPACountry('hasOwnProperty')).toBe(false);
  });
});
