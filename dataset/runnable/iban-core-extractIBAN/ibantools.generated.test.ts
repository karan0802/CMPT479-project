import { describe, it, expect } from 'vitest';
import { extractIBAN } from './ibantools';

describe('extractIBAN', () => {
  it('extracts a valid NL IBAN given with spaces (documented example)', () => {
    const result = extractIBAN('NL91 ABNA 0417 1643 00');
    expect(result).toEqual({
      iban: 'NL91ABNA0417164300',
      bban: 'ABNA0417164300',
      countryCode: 'NL',
      valid: true,
      accountNumber: '0417164300',
      bankIdentifier: 'ABNA',
    });
  });

  it('extracts a valid NL IBAN given lowercase and without separators', () => {
    const result = extractIBAN('nl91abna0417164300');
    expect(result).toEqual({
      iban: 'NL91ABNA0417164300',
      bban: 'ABNA0417164300',
      countryCode: 'NL',
      valid: true,
      accountNumber: '0417164300',
      bankIdentifier: 'ABNA',
    });
  });

  it('extracts a valid NL IBAN given with dashes as separators', () => {
    const result = extractIBAN('NL91-ABNA-0417-1643-00');
    expect(result).toEqual({
      iban: 'NL91ABNA0417164300',
      bban: 'ABNA0417164300',
      countryCode: 'NL',
      valid: true,
      accountNumber: '0417164300',
      bankIdentifier: 'ABNA',
    });
  });

  it('extracts a valid CH IBAN, populating only the fields CH defines', () => {
    const result = extractIBAN('CH93 0076 2011 6238 5295 7');
    expect(result).toEqual({
      iban: 'CH9300762011623852957',
      bban: '00762011623852957',
      countryCode: 'CH',
      valid: true,
      bankIdentifier: '00762',
    });
    expect(result.accountNumber).toBeUndefined();
    expect(result.branchIdentifier).toBeUndefined();
  });

  it('extracts a valid GB IBAN, including bank and branch identifiers', () => {
    const result = extractIBAN('GB29 NWBK 6016 1331 9268 19');
    expect(result).toEqual({
      iban: 'GB29NWBK60161331926819',
      bban: 'NWBK60161331926819',
      countryCode: 'GB',
      valid: true,
      bankIdentifier: 'NWBK',
      branchIdentifier: '601613',
    });
    expect(result.accountNumber).toBeUndefined();
  });

  it('marks an IBAN with an incorrect checksum as invalid and leaves derived fields unset', () => {
    // Same as the valid NL example but with the check digits changed from 91 to 92.
    const result = extractIBAN('NL92ABNA0417164300');
    expect(result).toEqual({
      iban: 'NL92ABNA0417164300',
      valid: false,
    });
    expect(result.bban).toBeUndefined();
    expect(result.countryCode).toBeUndefined();
    expect(result.accountNumber).toBeUndefined();
    expect(result.bankIdentifier).toBeUndefined();
  });

  it('marks an IBAN with an unknown country code as invalid', () => {
    const result = extractIBAN('ZZ91ABNA0417164300');
    expect(result).toEqual({
      iban: 'ZZ91ABNA0417164300',
      valid: false,
    });
  });

  it('marks an IBAN with the wrong length for its country as invalid', () => {
    // One character short of the required 18-char NL BBAN+country+check length.
    const result = extractIBAN('NL91ABNA041716430');
    expect(result).toEqual({
      iban: 'NL91ABNA041716430',
      valid: false,
    });
  });

  it('marks an IBAN whose BBAN fails the country format regexp as invalid', () => {
    // NL expects 4 letters then 10 digits; here digits and letters are swapped in the BBAN.
    const result = extractIBAN('NL910417ABNA164300');
    expect(result.valid).toBe(false);
    expect(result.bban).toBeUndefined();
    expect(result.countryCode).toBeUndefined();
  });

  it('normalizes non-IBAN input (uppercase, separators stripped) but reports it invalid', () => {
    const result = extractIBAN('foo-bar baz');
    expect(result).toEqual({
      iban: 'FOOBARBAZ',
      valid: false,
    });
  });

  it('handles an empty string as invalid without throwing', () => {
    const result = extractIBAN('');
    expect(result).toEqual({
      iban: '',
      valid: false,
    });
  });

  it('is deterministic across repeated calls with the same input', () => {
    const first = extractIBAN('NL91 ABNA 0417 1643 00');
    const second = extractIBAN('NL91 ABNA 0417 1643 00');
    expect(first).toEqual(second);
  });
});
