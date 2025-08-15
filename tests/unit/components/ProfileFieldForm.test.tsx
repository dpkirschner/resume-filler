import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { ProfileFieldForm, ProfileFieldFormProps } from '../../../src/ui/components/ProfileFieldForm';
import { ProfileField } from '../../../src/types';

// Mock child components for isolation and simplicity
jest.mock('../../../src/ui/components/common/Modal', () => ({
  Modal: ({ isOpen, onClose, title, children }: any) => 
    isOpen ? (
      <div role="dialog" aria-label={title}>
        <button data-testid="modal-close" onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null,
}));

describe('ProfileFieldForm', () => {
  let mockOnSubmit: jest.Mock;
  let mockOnClose: jest.Mock;

  const setup = (props: Partial<ProfileFieldFormProps> = {}) => {
    mockOnSubmit = jest.fn().mockResolvedValue(undefined);
    mockOnClose = jest.fn();

    const defaultProps: ProfileFieldFormProps = {
      isOpen: true,
      onClose: mockOnClose,
      onSubmit: mockOnSubmit,
      mode: 'add',
    };
    
    return render(<ProfileFieldForm {...defaultProps} {...props} />);
  };

  describe('in "add" mode', () => {
    it('should render the form with the correct title and empty fields', () => {
      setup({ mode: 'add' });
      
      expect(screen.getByRole('dialog', { name: /add profile field/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/field label/i)).toHaveValue('');
      expect(screen.getByLabelText(/value/i)).toHaveValue('');
    });

    it('should show validation errors when submitting an empty form', async () => {
      setup({ mode: 'add' });
      
      await userEvent.click(screen.getByRole('button', { name: /add field/i }));

      expect(await screen.findByText('Label is required')).toBeInTheDocument();
      expect(screen.getByText('Value is required')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should change the value input to a textarea for "Work Experience" type', async () => {
      setup({ mode: 'add' });

      // Initially, it's a standard input
      expect(screen.getByLabelText(/value/i).tagName).toBe('INPUT');

      const typeSelect = screen.getByLabelText(/field type/i);
      await userEvent.selectOptions(typeSelect, 'workExperience');

      // Now, it should be a textarea
      expect(screen.getByLabelText(/value/i).tagName).toBe('TEXTAREA');
      expect(screen.getByPlaceholderText(/json format/i)).toBeInTheDocument();
    });

    it('should call onSubmit with the correctly parsed WorkExperience data', async () => {
        setup({ mode: 'add' });
        const workExperienceData = [{ title: 'Developer', company: 'Tech Co' }];
        
        await userEvent.type(screen.getByLabelText(/field label/i), 'My Work');
        await userEvent.selectOptions(screen.getByLabelText(/field type/i), 'workExperience');
      
        const valueTextarea = screen.getByLabelText(/value/i);
        await userEvent.click(valueTextarea);
        await userEvent.paste(JSON.stringify(workExperienceData));
        
        await userEvent.click(screen.getByRole('button', { name: /add field/i }));
      
        await waitFor(() => {
          expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
            label: 'My Work',
            type: 'workExperience',
            value: workExperienceData,
          }));
        });
      });
  });

  describe('in "edit" mode', () => {
    const initialField: ProfileField = {
      label: 'LinkedIn URL',
      value: 'https://linkedin.com/in/johndoe',
      type: 'link', // This type is not in the dropdown, so it will default.
      isSensitive: true,
    };

    it('should render the form with the correct title and pre-populated data', () => {
      setup({ mode: 'edit', initialField });

      expect(screen.getByRole('dialog', { name: /edit profile field/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/field label/i)).toHaveValue(initialField.label);
      expect(screen.getByLabelText(/value/i)).toHaveValue(initialField.value as string);
      expect(screen.getByLabelText(/mark as sensitive data/i)).toBeChecked();
      
      // The `type` 'link' isn't an option, so react-hook-form uses the default 'custom'
      expect(screen.getByLabelText(/field type/i)).toHaveValue('custom');
    });

    it('should call onSubmit with updated data', async () => {
      setup({ mode: 'edit', initialField });
      
      const labelInput = screen.getByLabelText(/field label/i);
      await userEvent.clear(labelInput);
      await userEvent.type(labelInput, 'Updated Label');
      
      await userEvent.click(screen.getByRole('button', { name: /update field/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
          label: 'Updated Label',
          value: initialField.value, // Value was not changed
        }));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  it('should call onClose and reset the form when the cancel button is clicked', async () => {
    setup({ mode: 'add' });
    const labelInput = screen.getByLabelText(/field label/i);
    await userEvent.type(labelInput, 'Some text');

    expect(labelInput).toHaveValue('Some text');
    
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    // To verify reset, we re-render and check if the field is empty again
    render(<ProfileFieldForm isOpen={true} onClose={jest.fn()} onSubmit={jest.fn()} mode="add" />);
    expect(screen.getByLabelText(/field label/i)).toHaveValue('');
  });
});