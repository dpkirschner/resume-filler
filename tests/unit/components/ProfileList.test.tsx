import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { ProfileList, ProfileListProps } from '../../../src/ui/components/ProfileList';
import { ProfileField as ProfileFieldType } from '../../../src/types';

jest.mock('../../../src/ui/components/ProfileField', () => ({
  ProfileField: jest.fn(({ field, onEdit, onDelete, index }) => (
    <div data-testid={`profile-field-${index}`}>
      <span>{field.label}</span>
      <button title="Edit field" onClick={() => onEdit(index)}>Edit</button>
      <button title="Delete field" onClick={() => onDelete(index)}>Delete</button>
    </div>
  )),
}));

jest.mock('../../../src/ui/components/ProfileFieldForm', () => ({
  ProfileFieldForm: jest.fn(({ isOpen, onSubmit, mode, initialField }) =>
    isOpen ? (
      <div data-testid={`profile-form-${mode}`}>
        <button onClick={() => onSubmit(initialField || { label: 'New Field', value: 'New Value' })}>
          Submit Form
        </button>
      </div>
    ) : null
  ),
}));

describe('ProfileList Component', () => {
  let mockOnAddField: jest.Mock;
  let mockOnUpdateField: jest.Mock;
  let mockOnDeleteField: jest.Mock;

  const sampleFields: ProfileFieldType[] = [
    { label: 'First Name', value: 'John', type: 'personal', isSensitive: false },
    { label: 'Last Name', value: 'Doe', type: 'personal', isSensitive: false },
    { label: 'Job Title', value: 'Engineer', type: 'work', isSensitive: false },
  ];

  const setup = (props: Partial<ProfileListProps> = {}) => {
    mockOnAddField = jest.fn().mockResolvedValue(undefined);
    mockOnUpdateField = jest.fn().mockResolvedValue(undefined);
    mockOnDeleteField = jest.fn().mockResolvedValue(undefined);

    const defaultProps: ProfileListProps = {
      fields: sampleFields,
      onAddField: mockOnAddField,
      onUpdateField: mockOnUpdateField,
      onDeleteField: mockOnDeleteField,
      isLoading: false,
    };

    return render(<ProfileList {...defaultProps} {...props} />);
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the loading state when isLoading is true', () => {
    setup({ isLoading: true });
    expect(screen.getByText(/loading profile.../i)).toBeInTheDocument();
  });

  it('should render the empty state when there are no fields', () => {
    setup({ fields: [] });
    expect(screen.getByRole('heading', { name: /no profile fields yet/i })).toBeInTheDocument();
  });

  it('should render and group fields correctly', () => {
    setup();
    expect(screen.getByRole('heading', { name: /personal information/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /professional information/i })).toBeInTheDocument();
    expect(screen.getAllByTestId(/profile-field-/)).toHaveLength(3);
  });

  describe('Add Field Flow', () => {
    it('should open the "add" form when "Add Field" is clicked, and call onAddField on submit', async () => {
      setup();
      expect(screen.queryByTestId('profile-form-add')).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /add field/i }));
      expect(screen.getByTestId('profile-form-add')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /submit form/i }));

      await waitFor(() => {
        expect(mockOnAddField).toHaveBeenCalledWith({ label: 'New Field', value: 'New Value' });
      });
    });
  });

  describe('Edit Field Flow', () => {
    it('should open the "edit" form with initial data when an "Edit" button is clicked', async () => {
      setup();
      expect(screen.queryByTestId('profile-form-edit')).not.toBeInTheDocument();

      const secondField = screen.getByTestId('profile-field-1');
      // This query will now work because the mock renders the `title` attribute.
      await userEvent.click(secondField.querySelector('button[title="Edit field"]')!);

      expect(screen.getByTestId('profile-form-edit')).toBeInTheDocument();
      
      const ProfileFieldForm = require('../../../src/ui/components/ProfileFieldForm').ProfileFieldForm;
      expect(ProfileFieldForm).toHaveBeenCalledWith(
        expect.objectContaining({ initialField: sampleFields[1], mode: 'edit' }), {}
      );
    });
  });

  describe('Delete Field Flow', () => {
    let confirmSpy: jest.SpyInstance;
    
    beforeEach(() => {
      confirmSpy = jest.spyOn(window, 'confirm');
    });

    it('should call onDeleteField with the correct index when deletion is confirmed', async () => {
      confirmSpy.mockReturnValue(true);
      setup();

      const thirdField = screen.getByTestId('profile-field-2');
      await userEvent.click(thirdField.querySelector('button[title="Delete field"]')!);

      expect(confirmSpy).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(mockOnDeleteField).toHaveBeenCalledWith(2);
      });
    });

    it('should NOT call onDeleteField when deletion is cancelled', async () => {
      confirmSpy.mockReturnValue(false);
      setup();

      const firstField = screen.getByTestId('profile-field-0');
      await userEvent.click(firstField.querySelector('button[title="Delete field"]')!);
      
      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(mockOnDeleteField).not.toHaveBeenCalled();
    });
  });
});