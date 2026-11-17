import { describe, it, expect } from 'vitest';
import { extractBIC } from './ibantools';

describe('extractBIC', () => {
  describe('valid 8-character BICs (no branch code)', () => {
    it('parses a well-known NL BIC correctly', () => {
      const result = extractBIC('ABNANL2A');
      expect(result).toEqual({
        bankCode: 'ABNA',
        countryCode: 'NL',
        locationCode: '2A',
        branchCode: null,
        testBIC: false,
        valid: true,
      });
    });

    it('parses a well-known GB BIC correctly', () => {
      const result = extractBIC('NWBKGB2L');
      expect(result).toEqual({
        bankCode: 'NWBK',
        countryCode: 'GB',
        locationCode: '2L',
        branchCode: null,
        testBIC: false,
        valid: true,
      });
    });

    it('parses a BE BIC with alphabetic location code correctly', () => {
      const result = extractBIC('GEBABEBB');
      expect(result).toEqual({
        bankCode: 'GEBA',
        countryCode: 'BE',
        locationCode: 'BB',
        branchCode: null,
        testBIC: false,
        valid: true,
      });
    });
  });

  describe('valid 11-character BICs (with branch code)', () => {
    it('parses a DE BIC with a numeric branch code', () => {
      const result = extractBIC('DEUTDEFF500');
      expect(result).toEqual({
        bankCode: 'DEUT',
        countryCode: 'DE',
        locationCode: 'FF',
        branchCode: '500',
        testBIC: false,
        valid: true,
      });
    });

    it('parses a CH BIC with an alphanumeric branch code', () => {
      const result = extractBIC('UBSWCHZH80A');
      expect(result).toEqual({
        bankCode: 'UBSW',
        countryCode: 'CH',
        locationCode: 'ZH',
        branchCode: '80A',
        testBIC: false,
        valid: true,
      });
    });
  });

  describe('case insensitivity', () => {
    it('uppercases a fully lowercase BIC before parsing', () => {
      const result = extractBIC('abnanl2a');
      expect(result).toEqual({
        bankCode: 'ABNA',
        countryCode: 'NL',
        locationCode: '2A',
        branchCode: null,
        testBIC: false,
        valid: true,
      });
    });

    it('uppercases a mixed-case BIC before parsing', () => {
      const result = extractBIC('AbnaNl2A');
      expect(result).toEqual({
        bankCode: 'ABNA',
        countryCode: 'NL',
        locationCode: '2A',
        branchCode: null,
        testBIC: false,
        valid: true,
      });
    });

    it('uppercases a lowercase branch code segment as well', () => {
      const result = extractBIC('deutdeff500');
      expect(result).toEqual({
        bankCode: 'DEUT',
        countryCode: 'DE',
        locationCode: 'FF',
        branchCode: '500',
        testBIC: false,
        valid: true,
      });
    });
  });

  describe('testBIC detection', () => {
    it('flags testBIC as true when the second location-code character is "0"', () => {
      const result = extractBIC('DEUTDEF0');
      expect(result.valid).toBe(true);
      expect(result.locationCode).toBe('F0');
      expect(result.testBIC).toBe(true);
    });

    it('flags testBIC as false when the second location-code character is not "0"', () => {
      const result = extractBIC('ABNANL2A');
      expect(result.valid).toBe(true);
      expect(result.locationCode).toBe('2A');
      expect(result.testBIC).toBe(false);
    });

    it('flags testBIC as true even when a branch code is present', () => {
      const result = extractBIC('NOLANOF0123');
      expect(result.valid).toBe(true);
      expect(result.countryCode).toBe('NO');
      expect(result.locationCode).toBe('F0');
      expect(result.testBIC).toBe(true);
      expect(result.branchCode).toBe('123');
    });
  });

  describe('invalid BICs', () => {
    it('returns only valid:false for an empty string', () => {
      const result = extractBIC('');
      expect(result).toEqual({ valid: false });
    });

    it('returns only valid:false when too short (6 characters)', () => {
      const result = extractBIC('ABNANL');
      expect(result).toEqual({ valid: false });
    });

    it('returns only valid:false for a length that is neither 8 nor 11 (9 characters)', () => {
      const result = extractBIC('ABNANL2AB');
      expect(result).toEqual({ valid: false });
    });

    it('returns only valid:false for a length that is neither 8 nor 11 (10 characters)', () => {
      const result = extractBIC('ABNANL2ABC'.slice(0, 10));
      expect(result).toEqual({ valid: false });
    });

    it('returns only valid:false when the first 6 characters are not all letters', () => {
      const result = extractBIC('AB1ANL2A');
      expect(result).toEqual({ valid: false });
    });

    it('returns only valid:false when the country code is not in countrySpecs', () => {
      const result = extractBIC('ABNAXX2A');
      expect(result).toEqual({ valid: false });
    });

    it('leaves bankCode, countryCode, locationCode, branchCode and testBIC undefined on failure', () => {
      const result = extractBIC('ABNAXX2A');
      expect(result.valid).toBe(false);
      expect(result.bankCode).toBeUndefined();
      expect(result.countryCode).toBeUndefined();
      expect(result.locationCode).toBeUndefined();
      expect(result.branchCode).toBeUndefined();
      expect(result.testBIC).toBeUndefined();
    });
  });
});
