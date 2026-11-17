import { describe, it, expect } from 'vitest';
import { isValidBBAN } from './ibantools';

describe('isValidBBAN', () => {
  describe('invalid input guards', () => {
    it('returns false when bban is undefined', () => {
      expect(isValidBBAN(undefined, 'NL')).toBe(false);
    });

    it('returns false when countryCode is undefined', () => {
      expect(isValidBBAN('ABNA0417164300', undefined)).toBe(false);
    });

    it('returns false when both bban and countryCode are undefined', () => {
      expect(isValidBBAN(undefined, undefined)).toBe(false);
    });

    it('returns false when bban is null', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isValidBBAN(null as any, 'NL')).toBe(false);
    });

    it('returns false when countryCode is null', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isValidBBAN('ABNA0417164300', null as any)).toBe(false);
    });

    it('returns false for an unknown country code', () => {
      expect(isValidBBAN('ABNA0417164300', 'XX')).toBe(false);
    });

    it('returns false for an empty country code', () => {
      expect(isValidBBAN('ABNA0417164300', '')).toBe(false);
    });
  });

  describe('NL (regex + length, no validation func)', () => {
    it('validates a correct NL BBAN', () => {
      expect(isValidBBAN('ABNA0417164300', 'NL')).toBe(true);
    });

    it('rejects a NL BBAN with a digit where a letter is expected', () => {
      expect(isValidBBAN('A7NA0517164300', 'NL')).toBe(false);
    });

    it('rejects a NL BBAN with the wrong length', () => {
      expect(isValidBBAN('ABNA041716430', 'NL')).toBe(false);
    });

    it('rejects a NL BBAN with too many characters', () => {
      expect(isValidBBAN('ABNA04171643000', 'NL')).toBe(false);
    });
  });

  describe('AT (plain digit regex)', () => {
    it('validates a correct AT BBAN', () => {
      expect(isValidBBAN('1234567890123456', 'AT')).toBe(true);
    });

    it('rejects an AT BBAN containing a letter', () => {
      expect(isValidBBAN('123456789012345A', 'AT')).toBe(false);
    });

    it('rejects an AT BBAN with the wrong length', () => {
      expect(isValidBBAN('12345678901234', 'AT')).toBe(false);
    });
  });

  describe('GB (letters followed by digits)', () => {
    it('validates a correct GB BBAN', () => {
      expect(isValidBBAN('NWBK60161331926819', 'GB')).toBe(true);
    });

    it('rejects a GB BBAN with fewer than 4 leading letters', () => {
      expect(isValidBBAN('NWB060161331926819', 'GB')).toBe(false);
    });

    it('rejects a GB BBAN with the wrong length', () => {
      expect(isValidBBAN('NWBK6016133192681', 'GB')).toBe(false);
    });
  });

  describe('CH and LI (digits followed by alphanumeric)', () => {
    it('validates a correct CH BBAN', () => {
      expect(isValidBBAN('00762011623852957', 'CH')).toBe(true);
    });

    it('rejects a CH BBAN with letters in the first 5 characters', () => {
      expect(isValidBBAN('0076A011623852957', 'CH')).toBe(false);
    });

    it('validates a correct LI BBAN', () => {
      expect(isValidBBAN('08810000234013AA0', 'LI')).toBe(true);
    });

    it('rejects a LI BBAN with the wrong length', () => {
      expect(isValidBBAN('0881000023401AA', 'LI')).toBe(false);
    });
  });

  describe('DE (plain digit regex)', () => {
    it('validates a correct DE BBAN', () => {
      expect(isValidBBAN('370400440532013000', 'DE')).toBe(true);
    });

    it('rejects a DE BBAN containing a letter', () => {
      expect(isValidBBAN('37040044053201300A', 'DE')).toBe(false);
    });
  });

  describe('BE (checksum validation)', () => {
    // checkingPart = 123456789, 123456789 % 97 === 39, so checksum "39" is correct.
    it('validates a BE BBAN with a correct checksum', () => {
      expect(isValidBBAN('012345678939', 'BE')).toBe(true);
    });

    it('rejects a BE BBAN with an incorrect checksum', () => {
      expect(isValidBBAN('012345678900', 'BE')).toBe(false);
    });

    it('rejects a BE BBAN that fails the format check before checksum is evaluated', () => {
      expect(isValidBBAN('01234567893', 'BE')).toBe(false);
    });

    it('treats a checkingPart evenly divisible by 97 as requiring checksum 97', () => {
      // checkingPart = 970000000 -> 970000000 % 97 === 0 -> remainder forced to 97
      expect(isValidBBAN('097000000097', 'BE')).toBe(true);
    });

    it('rejects the divisible-by-97 case when checksum is given as 00 instead of 97', () => {
      expect(isValidBBAN('097000000000', 'BE')).toBe(false);
    });
  });

  describe('NO (checksum validation)', () => {
    // weights [5,4,3,2,7,6,5,4,3,2] over "1234500000" -> sum = 65, 65 % 11 = 10, control digit = 11 - 10 = 1
    it('validates a NO BBAN with a correct control digit', () => {
      expect(isValidBBAN('12345000001', 'NO')).toBe(true);
    });

    it('rejects a NO BBAN with an incorrect control digit', () => {
      expect(isValidBBAN('12345000000', 'NO')).toBe(false);
    });

    it('rejects a NO BBAN with the wrong length', () => {
      expect(isValidBBAN('1234500000', 'NO')).toBe(false);
    });

    it('rejects a NO BBAN containing a non-digit character', () => {
      expect(isValidBBAN('1234500000A', 'NO')).toBe(false);
    });
  });
});
