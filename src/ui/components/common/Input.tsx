import React, { forwardRef } from 'react';

// Utility function to generate ID from label
const generateIdFromLabel = (label: string): string => {
  return label
    .toLowerCase()
    .replace(/\s+/g, '-');
};

// Define the props for the Input component
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, error, helperText, className, ...rest }, ref) => {
    
    // Generate ID from label if not provided and label exists
    const inputId = id || (label && label.trim() ? generateIdFromLabel(label) : undefined);
    
    // Determine border styles based on the presence of an error.
    const errorClasses = 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500';
    const defaultClasses = 'border-gray-300 focus:ring-blue-500 focus:border-blue-500';
    
    // Combine base classes with conditional classes and custom className
    const inputClasses = [
      'block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm',
      error ? errorClasses : defaultClasses,
      className
    ].filter(Boolean).join(' ');

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={inputClasses}
          {...rest}
        />
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