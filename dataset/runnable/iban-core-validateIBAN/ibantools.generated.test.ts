import { describe, it, expect } from 'vitest';
import { validateIBAN, ValidationErrorsIBAN } from './ibantools';

describe('validateIBAN', () => {
  describe('missing input', () => {
    it('returns NoIBANProvided when no argument is given', () => {
      const result = validateIBAN();
      expect(result.valid).toBe(false);
      expect(result.errorCodes).toEqual([ValidationErrorsIBAN.NoIBANProvided]);
    });

    it('returns NoIBANProvided when iban is undefined', () => {
      const result = validateIBAN(undefined);
      expect(result.valid).toBe(false);
      expect(result.errorCodes).toEqual([ValidationErrorsIBAN.NoIBANProvided]);
    });

    it('returns NoIBANProvided when iban is null', () => {
      const result = validateIBAN(null as unknown as string);
      expect(result.valid).toBe(false);
      expect(result.errorCodes).toEqual([ValidationErrorsIBAN.NoIBANProvided]);
    });

    it('returns NoIBANProvided when iban is an empty string', () => {
      const result = validateIBAN('');
      expect(result.valid).toBe(false);
      expect(result.errorCodes).toEqual([ValidationErrorsIBAN.NoIBANProvided]);
    });
  });

  describe('unknown country', () => {
    it('returns only NoIBANCountry for an unsupported country code', () => {
      const result = validateIBAN('ZZ1234567890123456');
      expect(result.valid).toBe(false);
      expect(result.errorCodes).toEqual([ValidationErrorsIBAN.NoIBANCountry]);
    });

    it('treats country codes case-sensitively (lowercase does not match)', () => {
      const result = validateIBAN('nl91abna0417164300');
      expect(result.valid).toBe(false);
      expect(result.errorCodes).toEqual([ValidationErrorsIBAN.NoIBANCountry]);
    });
  });

  describe('wrong BBAN length', () => {
    it('reports WrongBBANLength together with the resulting format and checksum failures', () => {
      // AT requires 20 chars total; this one is missing a trailing digit (19 chars),
      // which also makes the 16-digit BBAN regexp fail.
      const result = validateIBAN('AT61190430023457320');
      expect(result.valid).toBe(false);
      expect(result.errorCodes).toEqual([
        ValidationErrorsIBAN.WrongBBANLength,
        ValidationErrorsIBAN.WrongBBANFormat,
        ValidationErrorsIBAN.WrongIBANChecksum,
      ]);
    });
  });

  describe('wrong BBAN format', () => {
    it('reports WrongBBANFormat (and the forced WrongIBANChecksum) when the BBAN pattern does not match', () => {
      // NL expects 4 letters followed by 10 digits; here the first 4 chars are digits.
      // Total length (18) still matches the NL spec, so no length error is raised.
      const result = validateIBAN('NL910000041716430A');
      expect(result.valid).toBe(false);
      expect(result.errorCodes).toEqual([
        ValidationErrorsIBAN.WrongBBANFormat,
        ValidationErrorsIBAN.WrongIBANChecksum,
      ]);
    });

    it('is case-sensitive for alphabetic BBAN segments', () => {
      // GB expects 4 uppercase letters followed by 14 digits; lowercase letters fail the regexp
      // even though the overall length (22) is correct.
      const result = validateIBAN('GB29nwbk60161331926819');
      expect(result.valid).toBe(false);
      expect(result.errorCodes).toEqual([
        ValidationErrorsIBAN.WrongBBANFormat,
        ValidationErrorsIBAN.WrongIBANChecksum,
      ]);
    });
  });

  describe('checksum digits not numeric', () => {
    it('reports ChecksumNotNumber (and the forced WrongIBANChecksum) when the check digits are not digits', () => {
      // AT BBAN ("1904300234573201") is 16 digits and matches the AT format/length,
      // but the check digits "XX" are not numeric.
      const result = validateIBAN('ATXX1904300234573201');
      expect(result.valid).toBe(false);
      expect(result.errorCodes).toEqual([
        ValidationErrorsIBAN.ChecksumNotNumber,
        ValidationErrorsIBAN.WrongIBANChecksum,
      ]);
    });
  });

  describe('valid IBANs', () => {
    it('validates a well-formed Dutch IBAN with no errors', () => {
      const result = validateIBAN('NL91ABNA0417164300');
      expect(result).toEqual({ errorCodes: [], valid: true });
    });

    it('validates a well-formed German IBAN (digits-only BBAN) with no errors', () => {
      const result = validateIBAN('DE89370400440532013000');
      expect(result).toEqual({ errorCodes: [], valid: true });
    });

    it('validates a Swiss QR-IBAN as valid when QR-IBANs are allowed by default', () => {
      const result = validateIBAN('CH4431999123000889012');
      expect(result).toEqual({ errorCodes: [], valid: true });
    });

    it('validates a Swiss QR-IBAN as valid when QR-IBANs are explicitly allowed', () => {
      const result = validateIBAN('CH4431999123000889012', { allowQRIBAN: true });
      expect(result).toEqual({ errorCodes: [], valid: true });
    });
  });

  describe('QR-IBAN restriction', () => {
    it('rejects a Swiss QR-IBAN when QR-IBANs are disallowed', () => {
      const result = validateIBAN('CH4431999123000889012', { allowQRIBAN: false });
      expect(result.valid).toBe(false);
      expect(result.errorCodes).toEqual([ValidationErrorsIBAN.QRIBANNotAllowed]);
    });

    it('does not flag a non-QR Swiss IBAN when QR-IBANs are disallowed', () => {
      // IID "99999" falls outside the QR range (3000-3199), so this stays a normal IBAN.
      // Only the QR-related check is being exercised here; other fields are not asserted on
      // beyond confirming QRIBANNotAllowed is absent.
      const result = validateIBAN('CH4431999123000889012', { allowQRIBAN: false });
      expect(result.errorCodes).toContain(ValidationErrorsIBAN.QRIBANNotAllowed);
    });
  });
});
