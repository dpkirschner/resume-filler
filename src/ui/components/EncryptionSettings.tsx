import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useEncryption } from '../hooks/useEncryption';
import { Button } from './common/Button';
import { PasswordInput } from './common/PasswordInput';
import { PassphraseRequirements } from './common/PassphraseRequirements';
import { createPassphraseValidator, createPassphraseConfirmationValidator } from '../../utils/validation';

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
  const { validationState, validatePassphrase } = useEncryption();
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<PassphraseFormData>();

  const passphrase = watch('passphrase', '');
  const confirmPassphrase = watch('confirmPassphrase', '');

  // Sync form passphrase with useEncryption hook for real-time validation
  useEffect(() => {
    if (!hasExistingProfile) {
      // Setup mode: pass both passphrase and confirmation
      validatePassphrase(passphrase || '', confirmPassphrase || '');
    } else {
      // Unlock mode: only validate passphrase, no confirmation needed
      validatePassphrase(passphrase || '');
    }
  }, [passphrase, confirmPassphrase, validatePassphrase, hasExistingProfile]);

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
          <PasswordInput
            id="passphrase-input"
            label="Passphrase"
            {...register('passphrase', { 
              required: 'Passphrase is required',
              minLength: hasExistingProfile ? undefined : { 
                value: 8, 
                message: 'Passphrase must be at least 8 characters' 
              },
              validate: hasExistingProfile ? undefined : createPassphraseValidator()
            })}
            error={errors.passphrase?.message}
            placeholder={hasExistingProfile ? 'Enter your passphrase' : 'Create a strong passphrase'}
          />

          {!hasExistingProfile && (
            <>
              <PasswordInput
                id="confirm-passphrase-input"
                label="Confirm Passphrase"
                {...register('confirmPassphrase', {
                  validate: createPassphraseConfirmationValidator(passphrase)
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