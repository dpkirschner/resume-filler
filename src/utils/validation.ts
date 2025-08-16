/**
 * Validates passphrase strength requirements
 * @param value - The passphrase to validate
 * @returns Validation result: true if valid, error message string if invalid
 */
export function validatePassphraseStrength(value: string): true | string {
  if (value.length < 8) {
    return 'Passphrase must be at least 8 characters';
  }
  
  const hasUpperCase = /[A-Z]/.test(value);
  const hasLowerCase = /[a-z]/.test(value);
  const hasNumbers = /\d/.test(value);
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value);
  
  const requirements = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar];
  const metRequirements = requirements.filter(Boolean).length;
  
  if (metRequirements < 3) {
    return 'Passphrase must contain at least 3 of the following: uppercase letters, lowercase letters, numbers, special characters';
  }
  
  return true;
}

/**
 * Creates a validation function for react-hook-form that validates passphrase strength
 * @returns Validation function compatible with react-hook-form's validate option
 */
export function createPassphraseValidator() {
  return (value: string | undefined) => {
    if (!value) {
      return 'Passphrase is required';
    }
    return validatePassphraseStrength(value);
  };
}

/**
 * Creates a validation function for react-hook-form that validates passphrase confirmation
 * @param originalPassphrase - The original passphrase to compare against
 * @returns Validation function compatible with react-hook-form's validate option
 */
export function createPassphraseConfirmationValidator(originalPassphrase: string) {
  return (value: string | undefined) => {
    if (!value) {
      return 'Please confirm your passphrase';
    }
    if (value !== originalPassphrase) {
      return 'Passphrases do not match';
    }
    return true;
  };
}