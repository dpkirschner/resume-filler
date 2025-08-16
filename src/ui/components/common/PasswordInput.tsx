import { useState, forwardRef } from 'react';
import { InputProps } from './Input';

export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  showToggle?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, id, error, helperText, className, showToggle = true, ...rest }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    
    // Generate ID from label if not provided and label exists
    const generateIdFromLabel = (label: string): string => {
      return label
        .toLowerCase()
        .replace(/\s+/g, '-');
    };
    
    const inputId = id || (label && label.trim() ? generateIdFromLabel(label) : undefined);
    
    // Determine border styles based on the presence of an error
    const errorClasses = 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500';
    const defaultClasses = 'border-gray-300 focus:ring-blue-500 focus:border-blue-500';
    
    // Combine base classes with conditional classes and custom className
    const inputClasses = [
      'block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm',
      showToggle ? 'pr-10' : '', // Add right padding when toggle is shown
      error ? errorClasses : defaultClasses,
      className
    ].filter(Boolean).join(' ');

    const toggleButtonClasses = [
      'absolute inset-y-0 right-0 flex items-center pr-3',
      'text-gray-400 hover:text-gray-600',
      'focus:outline-none focus:text-gray-600',
      'transition-colors duration-200'
    ].join(' ');

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            className={inputClasses}
            {...rest}
          />
          {showToggle && (
            <button
              type="button"
              className={toggleButtonClasses}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1} // Prevent tab focus, use mouse/click only
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {showPassword ? (
                  // Eye slash icon for "hide"
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                ) : (
                  // Eye icon for "show"
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                )}
              </svg>
            </button>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="mt-1 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';