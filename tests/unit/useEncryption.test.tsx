import { renderHook, act } from '@testing-library/react';
import { useEncryption } from '../../src/ui/hooks/useEncryption';

describe('useEncryption Hook', () => {
  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useEncryption());

      expect(result.current.passphrase).toBe('');
      expect(result.current.isValidPassphrase).toBe(false);
      expect(result.current.passphraseError).toBeNull();
    });
  });

  describe('Passphrase Validation', () => {
    it('should require passphrase to be present', () => {
      const { result } = renderHook(() => useEncryption());

      let isValid: boolean;
      act(() => {
        isValid = result.current.validatePassphrase('');
      });

      expect(isValid!).toBe(false);
      expect(result.current.passphraseError).toBe('Passphrase is required');
    });

    it('should require minimum length of 8 characters', () => {
      const { result } = renderHook(() => useEncryption());

      let isValid: boolean;
      act(() => {
        isValid = result.current.validatePassphrase('short');
      });

      expect(isValid!).toBe(false);
      expect(result.current.passphraseError).toBe('Passphrase must be at least 8 characters long');
    });

    it('should require at least 3 character types', () => {
      const { result } = renderHook(() => useEncryption());

      // Only lowercase letters
      let isValid: boolean;
      act(() => {
        isValid = result.current.validatePassphrase('lowercase');
      });
      expect(isValid!).toBe(false);
      expect(result.current.passphraseError).toContain('must contain at least 3 of the following');

      // Only uppercase and lowercase
      act(() => {
        isValid = result.current.validatePassphrase('LowerUpper');
      });
      expect(isValid!).toBe(false);
      expect(result.current.passphraseError).toContain('must contain at least 3 of the following');
    });

    describe('Valid Passphrases', () => {
      const validPassphrases = [
        'LowerUpper1',      // Uppercase + lowercase + numbers
        'LowerUpper!',      // Uppercase + lowercase + special
        'lower123!',        // Lowercase + numbers + special
        'UPPER123!',        // Uppercase + numbers + special
        'TestPass123!',     // All four types
      ];

      validPassphrases.forEach(passphrase => {
        it(`should accept valid passphrase: ${passphrase}`, () => {
          const { result } = renderHook(() => useEncryption());

          let isValid: boolean;
          act(() => {
            isValid = result.current.validatePassphrase(passphrase);
          });

          expect(isValid!).toBe(true);
          expect(result.current.passphraseError).toBeNull();
        });
      });
    });

    describe('Invalid Passphrases', () => {
      const invalidPassphrases = [
        { passphrase: '', reason: 'empty' },
        { passphrase: 'short', reason: 'too short' },
        { passphrase: 'onlylowercase', reason: 'only lowercase' },
        { passphrase: 'ONLYUPPERCASE', reason: 'only uppercase' },
        { passphrase: '1234567890', reason: 'only numbers' },
        { passphrase: '!@#$%^&*()', reason: 'only special characters' },
        { passphrase: 'lowernumber1', reason: 'only lowercase + numbers' },
        { passphrase: 'UPPERNUMBER1', reason: 'only uppercase + numbers' },
      ];

      invalidPassphrases.forEach(({ passphrase, reason }) => {
        it(`should reject invalid passphrase (${reason}): ${passphrase}`, () => {
          const { result } = renderHook(() => useEncryption());

          let isValid: boolean;
          act(() => {
            isValid = result.current.validatePassphrase(passphrase);
          });

          expect(isValid!).toBe(false);
          expect(result.current.passphraseError).not.toBeNull();
        });
      });
    });
  });

  describe('setPassphrase', () => {
    it('should update passphrase and validate automatically', () => {
      const { result } = renderHook(() => useEncryption());

      act(() => {
        result.current.setPassphrase('TestPass123!');
      });

      expect(result.current.passphrase).toBe('TestPass123!');
      expect(result.current.isValidPassphrase).toBe(true);
      expect(result.current.passphraseError).toBeNull();
    });

    it('should set error for invalid passphrase', () => {
      const { result } = renderHook(() => useEncryption());

      act(() => {
        result.current.setPassphrase('weak');
      });

      expect(result.current.passphrase).toBe('weak');
      expect(result.current.isValidPassphrase).toBe(false);
      expect(result.current.passphraseError).toBe('Passphrase must be at least 8 characters long');
    });

    it('should clear error when setting empty passphrase', () => {
      const { result } = renderHook(() => useEncryption());

      // First set an invalid passphrase
      act(() => {
        result.current.setPassphrase('weak');
      });

      expect(result.current.passphraseError).not.toBeNull();

      // Then clear it
      act(() => {
        result.current.setPassphrase('');
      });

      expect(result.current.passphrase).toBe('');
      expect(result.current.passphraseError).toBeNull();
      expect(result.current.isValidPassphrase).toBe(false);
    });
  });

  describe('clearPassphrase', () => {
    it('should clear passphrase and error state', () => {
      const { result } = renderHook(() => useEncryption());

      // Set a passphrase first
      act(() => {
        result.current.setPassphrase('TestPass123!');
      });

      expect(result.current.passphrase).toBe('TestPass123!');
      expect(result.current.isValidPassphrase).toBe(true);

      // Clear it
      act(() => {
        result.current.clearPassphrase();
      });

      expect(result.current.passphrase).toBe('');
      expect(result.current.passphraseError).toBeNull();
      expect(result.current.isValidPassphrase).toBe(false);
    });
  });

  describe('isValidPassphrase', () => {
    it('should be false for short passphrases even without errors', () => {
      const { result } = renderHook(() => useEncryption());

      act(() => {
        result.current.setPassphrase('1234567'); // 7 characters
      });

      expect(result.current.isValidPassphrase).toBe(false);
    });

    it('should be false when there are validation errors', () => {
      const { result } = renderHook(() => useEncryption());

      act(() => {
        result.current.setPassphrase('weakpassword'); // No numbers, uppercase, or special chars
      });

      expect(result.current.isValidPassphrase).toBe(false);
    });

    it('should be true for valid passphrases with no errors', () => {
      const { result } = renderHook(() => useEncryption());

      act(() => {
        result.current.setPassphrase('ValidPass123!');
      });

      expect(result.current.isValidPassphrase).toBe(true);
    });
  });

  describe('Character Type Detection', () => {
    it('should correctly identify uppercase letters', () => {
      const { result } = renderHook(() => useEncryption());

      // This should pass with uppercase + lowercase + numbers
      const isValid = result.current.validatePassphrase('TestPass123');

      expect(isValid).toBe(true);
    });

    it('should correctly identify special characters', () => {
      const { result } = renderHook(() => useEncryption());

      // Test various special characters
      const specialChars = '!@#$%^&*()_+-=[]{};\':\"\\|,.<>/?';
      for (const char of specialChars) {
        const passphrase = `Test${char}123`;
        const isValid = result.current.validatePassphrase(passphrase);
        expect(isValid).toBe(true);
      }
    });

    it('should handle edge cases in character detection', () => {
      const { result } = renderHook(() => useEncryption());

      // Test with Unicode characters
      const isValid = result.current.validatePassphrase('Tëst123!');
      expect(isValid).toBe(true);
    });
  });
});