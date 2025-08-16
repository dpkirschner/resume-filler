import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { EncryptionSettings, EncryptionSettingsProps } from '../../../src/ui/components/EncryptionSettings';
import { useEncryption } from '../../../src/ui/hooks/useEncryption';

jest.mock('../../../src/ui/hooks/useEncryption');
const mockUseEncryption = useEncryption as jest.Mock;

describe('EncryptionSettings', () => {
  let mockOnPassphraseSet: jest.Mock;
  let mockOnPassphraseVerified: jest.Mock;
  let mockValidatePassphrase: jest.Mock;

  beforeEach(() => {
    mockOnPassphraseSet = jest.fn();
    mockOnPassphraseVerified = jest.fn();
    mockValidatePassphrase = jest.fn().mockReturnValue(true);

    mockUseEncryption.mockReturnValue({
      passphrase: '',
      setPassphrase: jest.fn(),
      isValidPassphrase: false,
      passphraseError: null,
      validationState: {
        minLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false,
        hasSpecialChar: false,
        allRequirementsMet: false,
      },
      validatePassphrase: mockValidatePassphrase,
      clearPassphrase: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props: Partial<EncryptionSettingsProps> = {}) => {
    const defaultProps: EncryptionSettingsProps = {
      onPassphraseSet: mockOnPassphraseSet,
      onPassphraseVerified: mockOnPassphraseVerified,
      hasExistingProfile: false,
      isLoading: false,
    };
    return render(<EncryptionSettings {...defaultProps} {...props} />);
  };

  describe('in "Set Up" mode (hasExistingProfile: false)', () => {
    it('should render the setup form correctly', () => {
      renderComponent({ hasExistingProfile: false });

      // Mock the validation state for this specific test
      mockUseEncryption.mockReturnValueOnce({
        validatePassphrase: mockValidatePassphrase,
        validationState: {
          minLength: false,
          hasUpperCase: false,
          hasLowerCase: false,
          hasNumber: false,
          hasSpecialChar: false,
          allRequirementsMet: false,
        },
        setPassphrase: jest.fn(),
        isValidPassphrase: false,
      });

      expect(screen.getByRole('heading', { name: /set up encryption/i })).toBeInTheDocument();
      
      expect(screen.getByLabelText(/^passphrase$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm passphrase/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /set up encryption/i })).toBeDisabled();
    });

    it.each([
      { value: 'short', expectedError: /passphrase must be at least 8 characters/i },
      { value: 'weakpass', expectedError: /passphrase must contain at least 3 of the following/i },
    ])('should show validation errors for weak passphrases', async ({ value, expectedError }) => {
      renderComponent({ hasExistingProfile: false });
      
      const passphraseInput = screen.getByLabelText(/^passphrase$/i);
      const form = passphraseInput.closest('form')!;
      
      await userEvent.type(passphraseInput, value);
      // Trigger validation by submitting the form directly
      fireEvent.submit(form);
      
      expect(await screen.findByText(expectedError)).toBeInTheDocument();
    });
    
    it('should show an error if passphrases do not match', async () => {
        renderComponent({ hasExistingProfile: false });

        const passphraseInput = screen.getByLabelText(/^passphrase$/i);
        const confirmInput = screen.getByLabelText(/confirm passphrase/i);
        const form = passphraseInput.closest('form')!;

        await userEvent.type(passphraseInput, 'ValidPass1!');
        await userEvent.type(confirmInput, 'DoesNotMatch');
        // Trigger validation by submitting the form directly
        fireEvent.submit(form);

        expect(await screen.findByText(/passphrases do not match/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /set up encryption/i })).toBeDisabled();
    });

    it('should enable the submit button only when the form is valid', async () => {
      renderComponent({ hasExistingProfile: false });

      const passphraseInput = screen.getByLabelText(/^passphrase$/i);
      const confirmInput = screen.getByLabelText(/confirm passphrase/i);
      const submitButton = screen.getByRole('button', { name: /set up encryption/i });

      expect(submitButton).toBeDisabled();

      await userEvent.type(passphraseInput, 'ValidPass1!');
      await userEvent.type(confirmInput, 'ValidPass1!');

      expect(submitButton).toBeEnabled();
    });

    it('should call onPassphraseSet on successful submission', async () => {
      renderComponent({ hasExistingProfile: false });

      const passphraseInput = screen.getByLabelText(/^passphrase$/i);
      const confirmInput = screen.getByLabelText(/confirm passphrase/i);
      const submitButton = screen.getByRole('button', { name: /set up encryption/i });

      const validPassphrase = 'ThisIsAValidPassword1!';
      await userEvent.type(passphraseInput, validPassphrase);
      await userEvent.type(confirmInput, validPassphrase);
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockValidatePassphrase).toHaveBeenCalledWith(validPassphrase);
        expect(mockOnPassphraseSet).toHaveBeenCalledWith(validPassphrase);
        expect(mockOnPassphraseVerified).not.toHaveBeenCalled();
      });
    });
  });

  describe('in "Unlock" mode (hasExistingProfile: true)', () => {
    it('should render the unlock form correctly', () => {
      renderComponent({ hasExistingProfile: true });

      expect(screen.getByRole('heading', { name: /enter passphrase/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/passphrase/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/confirm passphrase/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /unlock profile/i })).toBeDisabled();
    });

    it('should enable the submit button when a passphrase is entered', async () => {
        renderComponent({ hasExistingProfile: true });
        const passphraseInput = screen.getByLabelText(/passphrase/i);
        const submitButton = screen.getByRole('button', { name: /unlock profile/i });
        
        expect(submitButton).toBeDisabled();
        
        // Mock the validation state to be true for this specific test
        mockUseEncryption.mockReturnValueOnce({
          validatePassphrase: mockValidatePassphrase,
          validationState: {
            minLength: true,
            hasUpperCase: false,
            hasLowerCase: false,
            hasNumber: false,
            hasSpecialChar: false,
            allRequirementsMet: false,
          },
          setPassphrase: jest.fn(),
          isValidPassphrase: true, // Only isValidPassphrase matters for this test
        });

        await userEvent.type(passphraseInput, 'any-password');
        expect(submitButton).toBeEnabled();
    });

    it('should call onPassphraseVerified on successful submission', async () => {
      renderComponent({ hasExistingProfile: true });
      const passphraseInput = screen.getByLabelText(/passphrase/i);
      const submitButton = screen.getByRole('button', { name: /unlock profile/i });

      const existingPassphrase = 'my-secret-password';
      await userEvent.type(passphraseInput, existingPassphrase);
      
      // Mock the validation state to be true for this specific test
      mockUseEncryption.mockReturnValueOnce({
        validatePassphrase: mockValidatePassphrase,
        validationState: {
          minLength: true,
          hasUpperCase: true,
          hasLowerCase: true,
          hasNumber: true,
          hasSpecialChar: true,
          allRequirementsMet: true,
        },
        setPassphrase: jest.fn(),
        isValidPassphrase: true,
      });

      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnPassphraseVerified).toHaveBeenCalledWith(existingPassphrase);
        expect(mockOnPassphraseSet).not.toHaveBeenCalled();
      });
    });

    it('should show "Processing..." and disable the button when isLoading is true', () => {
        renderComponent({ hasExistingProfile: true, isLoading: true });
        
        // Mock the validation state for this specific test
        mockUseEncryption.mockReturnValueOnce({
          validatePassphrase: mockValidatePassphrase,
          validationState: {
            minLength: true,
            hasUpperCase: true,
            hasLowerCase: true,
            hasNumber: true,
            hasSpecialChar: true,
            allRequirementsMet: true,
          },
          setPassphrase: jest.fn(),
          isValidPassphrase: true,
        });

        const submitButton = screen.getByRole('button', { name: /processing.../i });
        expect(submitButton).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
    });
  });
});