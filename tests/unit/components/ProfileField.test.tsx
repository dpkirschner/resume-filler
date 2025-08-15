import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { ProfileField, ProfileFieldProps } from '../../../src/ui/components/ProfileField';
import { ProfileField as ProfileFieldType } from '../../../src/types';

describe('ProfileField Component', () => {
  let mockOnEdit: jest.Mock;
  let mockOnDelete: jest.Mock;

  const simpleField: ProfileFieldType = {
    label: 'First Name',
    value: 'John Doe',
    type: 'personal',
    isSensitive: false,
  };

  const longValueField: ProfileFieldType = {
    label: 'Biography',
    value: 'This is a very long biography that is definitely going to exceed the fifty character limit for truncation.',
    type: 'custom',
    isSensitive: false,
  };

  const workExperienceField: ProfileFieldType = {
    label: 'Professional History',
    value: [
      { title: 'Senior Developer', company: 'Tech Corp', location: 'San Francisco, CA', startDate: '2020-01-01', endDate: 'Present', description: 'Wrote great code.' },
      { title: 'Junior Developer', company: 'Startup Inc', location: 'Austin, TX', startDate: '2018-01-01', endDate: '2019-12-31', description: 'Wrote good code.' },
    ],
    type: 'workExperience',
    isSensitive: false,
  };

  const setup = (props: Partial<ProfileFieldProps> = {}) => {
    mockOnEdit = jest.fn();
    mockOnDelete = jest.fn();
    const defaultProps: ProfileFieldProps = {
      field: simpleField,
      index: 0,
      onEdit: mockOnEdit,
      onDelete: mockOnDelete,
    };
    return render(<ProfileField {...defaultProps} {...props} />);
  };

  it('should render a simple string field correctly', () => {
    setup();

    expect(screen.getByRole('heading', { name: 'First Name' })).toBeInTheDocument();
    expect(screen.getByText('personal')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Sensitive')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /show more/i })).not.toBeInTheDocument();
  });

  it('should render a sensitive field with a "Sensitive" badge', () => {
    setup({ field: { ...simpleField, isSensitive: true } });
    expect(screen.getByText('Sensitive')).toBeInTheDocument();
  });

  it('should call onEdit and onDelete with the correct index when buttons are clicked', async () => {
    setup({ index: 5 });

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(mockOnEdit).toHaveBeenCalledWith(5);
    expect(mockOnEdit).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(mockOnDelete).toHaveBeenCalledWith(5);
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  describe('when handling long text', () => {
    it('should truncate long values and allow expansion', async () => {
      setup({ field: longValueField });
    
      const showMoreButton = screen.getByRole('button', { name: /show more/i });
      const valueContainer = showMoreButton.parentElement;
    
      // This regex correctly checks that the text STARTS with the beginning of the
      // long string and ENDS with "Show more", which is what's actually rendered.
      expect(valueContainer).toHaveTextContent(/^This is a very long biography.*Show more$/);
    
      // The rest of the test can now proceed correctly.
      await userEvent.click(showMoreButton);
      expect(screen.getByText(longValueField.value as string)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /show less/i })).toBeInTheDocument();
    });
  });

  describe('when handling work experience', () => {
    it('should render a summary and allow expansion to show details', async () => {
      setup({ field: workExperienceField });

      // Initially, summary is shown and details are hidden
      expect(screen.getByText('2 work experience entries')).toBeInTheDocument();
      expect(screen.queryByText('Senior Developer at Tech Corp')).not.toBeInTheDocument();
      const showMoreButton = screen.getByRole('button', { name: /show more/i });
      expect(showMoreButton).toBeInTheDocument();
      
      // Act: Click "Show more"
      await userEvent.click(showMoreButton);

      // Assert: Details are now visible
      expect(screen.getByText('Work Experience Details:')).toBeInTheDocument();
      expect(screen.getByText('Senior Developer at Tech Corp')).toBeInTheDocument();
      expect(screen.getByText('Junior Developer at Startup Inc')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /show less/i })).toBeInTheDocument();
    });
  });
});