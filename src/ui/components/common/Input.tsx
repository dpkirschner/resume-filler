import React, { forwardRef } from 'react';

// Define the props for the Input component
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string; // `id` is required for accessibility
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, error, ...rest }, ref) => {
    
    // Determine border styles based on the presence of an error.
    const errorClasses = 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500';
    const defaultClasses = 'border-gray-300 focus:ring-blue-500 focus:border-blue-500';

    return (
      <div className="space-y-1">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <input
          id={id}
          ref={ref}
          className={`
            block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm
            ${error ? errorClasses : defaultClasses}
          `.trim()}
          {...rest}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);