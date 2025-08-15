import { useState, useCallback } from 'react';

export interface UseEncryptionReturn {
  passphrase: string;
  setPassphrase: (passphrase: string) => void;
  isValidPassphrase: boolean;
  passphraseError: string | null;
  validatePassphrase: (passphrase: string) => boolean;
  clearPassphrase: () => void;
}

/**
 * Custom hook for managing encryption passphrase state and validation
 */
export function useEncryption(): UseEncryptionReturn {
  const [passphrase, setPassphraseState] = useState('');
  const [passphraseError, setPassphraseError] = useState<string | null>(null);

  const validatePassphrase = useCallback((passphrase: string): boolean => {
    setPassphraseError(null);

    if (!passphrase) {
      setPassphraseError('Passphrase is required');
      return false;
    }

    if (passphrase.length < 8) {
      setPassphraseError('Passphrase must be at least 8 characters long');
      return false;
    }

    // Additional security requirements
    const hasUpperCase = /[A-Z]/.test(passphrase);
    const hasLowerCase = /[a-z]/.test(passphrase);
    const hasNumbers = /\d/.test(passphrase);
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(passphrase);

    const requirements = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar];
    const metRequirements = requirements.filter(Boolean).length;

    if (metRequirements < 3) {
      setPassphraseError(
        'Passphrase must contain at least 3 of the following: uppercase letters, lowercase letters, numbers, special characters'
      );
      return false;
    }

    return true;
  }, []);

  const setPassphrase = useCallback((newPassphrase: string) => {
    setPassphraseState(newPassphrase);
    if (newPassphrase) {
      validatePassphrase(newPassphrase);
    } else {
      setPassphraseError(null);
    }
  }, [validatePassphrase]);

  const clearPassphrase = useCallback(() => {
    setPassphraseState('');
    setPassphraseError(null);
  }, []);

  const isValidPassphrase = passphrase.length >= 8 && passphraseError === null;

  return {
    passphrase,
    setPassphrase,
    isValidPassphrase,
    passphraseError,
    validatePassphrase,
    clearPassphrase
  };
}