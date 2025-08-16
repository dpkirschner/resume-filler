import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useEncryption } from '../hooks/useEncryption';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { PassphraseRequirements } from './common/PassphraseRequirements';

export interface EncryptionSettingsProps {
  onPassphraseSet: (passphrase: string) => void;
  onPassphraseVerified: (passphrase: string) => void;
  hasExistingProfile: boolean;
  isLoading?: boolean;
}

interface PassphraseFormData {
  passphrase: string;
  confirmPassphrase?: string;
}

export function EncryptionSettings({
  onPassphraseSet,
  onPassphraseVerified,
  hasExistingProfile,
  isLoading = false
}: EncryptionSettingsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { validationState, validatePassphrase } = useEncryption();
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<PassphraseFormData>();

  const passphrase = watch('passphrase', '');
  const confirmPassphrase = watch('confirmPassphrase', '');

  const onSubmit = async (data: PassphraseFormData) => {
    if (hasExistingProfile) {
      onPassphraseVerified(data.passphrase);
    } else {
      if (validatePassphrase(data.passphrase)) {
        onPassphraseSet(data.passphrase);
      }
    }
  };

  const isValidForm = hasExistingProfile 
    ? passphrase.length > 0
    : passphrase.length >= 8 && !errors.passphrase && passphrase === confirmPassphrase;

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            {hasExistingProfile ? 'Enter Passphrase' : 'Set Up Encryption'}
          </h2>
          <p className="text-sm text-gray-600">
            {hasExistingProfile 
              ? 'Enter your passphrase to access your encrypted profile data.'
              : 'Create a strong passphrase to encrypt your profile data. This passphrase will be required to access your data.'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="passphrase-input" className="block text-sm font-medium text-gray-700 mb-1">
              Passphrase
            </label>
            <div className="relative flex items-center">
              <input
                id="passphrase-input"
                type={showPassword ? 'text' : 'password'}
                {...register('passphrase', { 
                  required: 'Passphrase is required',
                  minLength: hasExistingProfile ? undefined : { 
                    value: 8, 
                    message: 'Passphrase must be at least 8 characters' 
                  },
                  validate: hasExistingProfile ? undefined : (value) => {
                    if (value.length < 8) return 'Passphrase must be at least 8 characters';
                    
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
                })}
                className={`
                  flex-1 px-3 py-2 pr-12 border rounded-md shadow-sm focus:outline-none focus:ring-1 text-sm
                  ${errors.passphrase
                    ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }
                `.trim()}
                placeholder={hasExistingProfile ? 'Enter your passphrase' : 'Create a strong passphrase'}
              />
              <button
                type="button"
                className="absolute right-2 p-2 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {showPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  )}
                </svg>
              </button>
            </div>
            {errors.passphrase && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.passphrase.message}
              </p>
            )}
          </div>

          {!hasExistingProfile && (
            <>
              <Input
                id="confirm-passphrase-input"
                label="Confirm Passphrase"
                type={showPassword ? 'text' : 'password'}
                {...register('confirmPassphrase', {
                  required: 'Please confirm your passphrase',
                  validate: (value) => 
                    value === passphrase || 'Passphrases do not match'
                })}
                error={errors.confirmPassphrase?.message}
                placeholder="Confirm your passphrase"
              />

              <PassphraseRequirements validationState={validationState} />
            </>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex">
              <svg className="flex-shrink-0 h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">
                  Important Security Notice
                </h4>
                <p className="text-xs text-yellow-700 mt-1">
                  {hasExistingProfile 
                    ? 'Your data is encrypted locally. If you forget your passphrase, your data cannot be recovered.'
                    : 'Choose a passphrase you can remember. If you forget it, your encrypted data cannot be recovered.'
                  }
                </p>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!isValidForm || isLoading}
          >
            {isLoading 
              ? 'Processing...' 
              : hasExistingProfile 
                ? 'Unlock Profile' 
                : 'Set Up Encryption'
            }
          </Button>
        </form>
      </div>
    </div>
  );
}