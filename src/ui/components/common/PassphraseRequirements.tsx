import React from 'react';
import { PassphraseValidationState } from '../../hooks/useEncryption';

interface PassphraseRequirementProps {
  isValid: boolean;
  text: string;
}

const Requirement: React.FC<PassphraseRequirementProps> = ({ isValid, text }) => {
  const colorClass = isValid ? 'text-green-600' : 'text-red-600';
  const icon = isValid ? '✓' : '✗';

  return (
    <li className={`flex items-center ${colorClass}`}>
      <span className="mr-2">{icon}</span>
      <span>{text}</span>
    </li>
  );
};

export interface PassphraseRequirementsProps {
  validationState: PassphraseValidationState;
}

export const PassphraseRequirements: React.FC<PassphraseRequirementsProps> = ({ validationState }) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
      <h4 className="text-sm font-medium text-blue-900 mb-1">
        Passphrase Requirements:
      </h4>
      <ul className="text-xs space-y-1">
        <Requirement isValid={validationState.minLength} text="At least 8 characters long" />
        <Requirement 
          isValid={validationState.hasUpperCase && validationState.hasLowerCase && validationState.hasNumber && validationState.hasSpecialChar}
          text="Include at least 3 of the following:"
        />
        <li className="ml-4">
          <ul className="text-xs space-y-1">
            <Requirement isValid={validationState.hasUpperCase} text="Uppercase letters (A-Z)" />
            <Requirement isValid={validationState.hasLowerCase} text="Lowercase letters (a-z)" />
            <Requirement isValid={validationState.hasNumber} text="Numbers (0-9)" />
            <Requirement isValid={validationState.hasSpecialChar} text="Special characters (!@#$%^&*)" />
          </ul>
        </li>
      </ul>
    </div>
  );
};