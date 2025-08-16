import { useState, useCallback } from 'react';

export interface PassphraseValidationState {
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  allRequirementsMet: boolean;
}

export interface UseEncryptionReturn {
  passphrase: string;
  setPassphrase: (passphrase: string) => void;
  isValidPassphrase: boolean;
  passphraseError: string | null;
  validationState: PassphraseValidationState;
  validatePassphrase: (passphrase: string) => boolean;
  clearPassphrase: () => void;
}

const initialValidationState: PassphraseValidationState = {
  minLength: false,
  hasUpperCase: false,
  hasLowerCase: false,
  hasNumber: false,
  hasSpecialChar: false,
  allRequirementsMet: false,
};

/**
 * Custom hook for managing encryption passphrase state and validation
 */
export function useEncryption(): UseEncryptionReturn {
  const [passphrase, setPassphraseState] = useState('');
  const [passphraseError, setPassphraseError] = useState<string | null>(null);
  const [validationState, setValidationState] = useState<PassphraseValidationState>(initialValidationState);

  const validatePassphrase = useCallback((passphrase: string): boolean => {
    const minLength = passphrase.length >= 8;
    const hasUpperCase = /[A-Z]/.test(passphrase);
    const hasLowerCase = /[a-z]/.test(passphrase);
    const hasNumber = /\d/.test(passphrase);
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(passphrase);

    const requirements = [hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar];
    const metRequirements = requirements.filter(Boolean).length;

    const allRequirementsMet = minLength && metRequirements >= 3;

    setValidationState({
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecialChar,
      allRequirementsMet,
    });

    if (!passphrase) {
      setPassphraseError('Passphrase is required');
      return false;
    }

    if (!allRequirementsMet) {
      if (!minLength) {
        setPassphraseError('Passphrase must be at least 8 characters long');
      } else {
        setPassphraseError(
          'Passphrase must contain at least 3 of the following: uppercase letters, lowercase letters, numbers, special characters'
        );
      }
      return false;
    }

    setPassphraseError(null);
    return true;
  }, []);

  const setPassphrase = useCallback((newPassphrase: string) => {
    setPassphraseState(newPassphrase);
    if (newPassphrase === '') {
      setPassphraseError(null);
      setValidationState(initialValidationState);
    } else {
      validatePassphrase(newPassphrase);
    }
  }, [validatePassphrase]);

  const clearPassphrase = useCallback(() => {
    setPassphraseState('');
    setPassphraseError(null);
    setValidationState(initialValidationState);
  }, []);

  const isValidPassphrase = validationState.allRequirementsMet;

  return {
    passphrase,
    setPassphrase,
    isValidPassphrase,
    passphraseError,
    validationState,
    validatePassphrase,
    clearPassphrase
  };
}