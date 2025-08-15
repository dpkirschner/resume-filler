import React from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  // Generate a unique ID for the title to be referenced by aria-labelledby
  const titleId = title ? 'modal-title' : undefined;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
          data-testid="modal-overlay" 
        />

        {/* This element is to trick the browser into centering the modal contents. */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal panel */}
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {title && (
            <div className="mb-4">
              <h3 
                id={titleId} 
                className="text-lg font-medium leading-6 text-gray-900"
              >
                {title}
              </h3>
            </div>
          )}
          
          <div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}