import React from 'react';
import { PassphraseValidationState } from '../../hooks/useEncryption';

interface PassphraseRequirementProps {
  isValid: boolean;
  text: string;
  isDeemphasized?: boolean;
}

const Requirement: React.FC<PassphraseRequirementProps> = ({ isValid, text, isDeemphasized = false }) => {
  let colorClass: string;
  let icon: string;
  
  if (isDeemphasized) {
    colorClass = 'text-gray-400';
    icon = '○'; // Empty circle for de-emphasized items
  } else {
    colorClass = isValid ? 'text-green-600' : 'text-red-600';
    icon = isValid ? '✓' : '✗';
  }

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
  // Calculate how many character type requirements are met
  const requirements = [
    validationState.hasUpperCase,
    validationState.hasLowerCase,
    validationState.hasNumber,
    validationState.hasSpecialChar
  ];
  const metRequirements = requirements.filter(Boolean).length;
  const hasAtLeastThree = metRequirements >= 3;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
      <h4 className="text-sm font-medium text-blue-900 mb-1">
        Passphrase Requirements:
      </h4>
      <ul className="text-xs space-y-1">
        <Requirement isValid={validationState.minLength} text="At least 8 characters long" />
        <Requirement 
          isValid={hasAtLeastThree}
          text="Include at least 3 of the following:"
        />
        <li className="ml-4">
          <ul className="text-xs space-y-1">
            <Requirement 
              isValid={validationState.hasUpperCase} 
              text="Uppercase letters (A-Z)"
              isDeemphasized={hasAtLeastThree && !validationState.hasUpperCase}
            />
            <Requirement 
              isValid={validationState.hasLowerCase} 
              text="Lowercase letters (a-z)"
              isDeemphasized={hasAtLeastThree && !validationState.hasLowerCase}
            />
            <Requirement 
              isValid={validationState.hasNumber} 
              text="Numbers (0-9)"
              isDeemphasized={hasAtLeastThree && !validationState.hasNumber}
            />
            <Requirement 
              isValid={validationState.hasSpecialChar} 
              text="Special characters (!@#$%^&*)"
              isDeemphasized={hasAtLeastThree && !validationState.hasSpecialChar}
            />
          </ul>
        </li>
        <Requirement 
          isValid={validationState.confirmationMatches} 
          text="Passphrases match"
        />
      </ul>
    </div>
  );
};