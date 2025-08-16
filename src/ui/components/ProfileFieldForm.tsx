import { useForm } from 'react-hook-form';
import { ProfileField, WorkExperience } from '../../types';
import { Logger } from '../../utils';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { Modal } from './common/Modal';
import { useEffect } from 'react';

const logger = new Logger('ProfileFieldForm');

export interface ProfileFieldFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (field: ProfileField) => Promise<void>;
  initialField?: ProfileField;
  mode: 'add' | 'edit';
}

interface FormData {
  label: string;
  value: string;
  type: ProfileField['type'];
  isSensitive: boolean;
}

// Helper function to ensure the type is always a valid option
const getValidType = (type?: ProfileField['type']): ProfileField['type'] => {
  const validTypes: ProfileField['type'][] = ['personal', 'work', 'custom', 'workExperience', 'eeo'];
  if (type && validTypes.includes(type)) {
    return type;
  }
  return 'custom'; // Default fallback
};

// ✨ FIX: The full props list was missing from the function signature. It has been restored here.
export function ProfileFieldForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialField,
  mode 
}: ProfileFieldFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    defaultValues: {
      label: initialField?.label || '',
      value: typeof initialField?.value === 'string' ? initialField.value : '',
      type: getValidType(initialField?.type),
      isSensitive: initialField?.isSensitive || false
    }
  });

  // This useEffect will correctly update the form when props change for "edit" mode.
  useEffect(() => {
    if (initialField) {
      reset({
        label: initialField.label,
        value: typeof initialField.value === 'string' ? initialField.value : '',
        type: getValidType(initialField.type),
        isSensitive: initialField.isSensitive || false
      });
    }
  }, [initialField, reset]);

  const fieldType = watch('type');

  const onFormSubmit = async (data: FormData) => {
    try {
      let processedValue: string | WorkExperience[] = data.value;

      if (data.type === 'workExperience' && data.value) {
        try {
          processedValue = JSON.parse(data.value) as WorkExperience[];
        } catch {
          processedValue = data.value;
        }
      }

      const field: ProfileField = {
        label: data.label,
        value: processedValue,
        type: data.type,
        isSensitive: data.isSensitive
      };

      await onSubmit(field);
      reset();
      onClose();
    } catch (error) {
      logger.error('Failed to submit field:', error);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const getFieldTypeHelperText = (type: ProfileField['type']): string => {
    const helpTexts = {
      personal: 'Basic personal information like name, email, phone',
      work: 'Professional information like job titles, skills',
      custom: 'Any custom field you want to add',
      eeo: 'Equal Employment Opportunity information (sensitive)',
      workExperience: 'Work experience data (as JSON array or text)'
    };
    return helpTexts[type];
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title={mode === 'add' ? 'Add Profile Field' : 'Edit Profile Field'}
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <Input
          id="profile-field-label"
          label="Field Label"
          {...register('label', { 
            required: 'Label is required',
            minLength: { value: 1, message: 'Label cannot be empty' }
          })}
          error={errors.label?.message}
          placeholder="e.g., First Name, LinkedIn URL"
        />

        <div>
          <label htmlFor="profile-field-type" className="block text-sm font-medium text-gray-700 mb-1">
            Field Type
          </label>
          <select
            id="profile-field-type"
            {...register('type', { required: 'Type is required' })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="personal">Personal</option>
            <option value="work">Work</option>
            <option value="custom">Custom</option>
            <option value="workExperience">Work Experience</option>
            <option value="eeo">EEO (Sensitive)</option>
          </select>
          <p className="mt-1 text-sm text-gray-500">
            {getFieldTypeHelperText(fieldType)}
          </p>
        </div>

        <div>
          <label htmlFor="profile-field-value" className="block text-sm font-medium text-gray-700 mb-1">
            Value
          </label>
          {fieldType === 'workExperience' ? (
            <textarea
              id="profile-field-value"
              {...register('value', { required: 'Value is required' })}
              rows={6}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder='JSON format: [{"title": "Software Engineer", "company": "Google", "location": "CA", "startDate": "2020-01", "endDate": "2023-01", "description": "Built things"}]'
            />
          ) : (
            <Input
              id="profile-field-value"
              {...register('value', { required: 'Value is required' })}
              error={errors.value?.message}
              placeholder="Enter the field value"
            />
          )}
        </div>

        <div className="flex items-center">
          <input
            id="profile-field-sensitive"
            type="checkbox"
            {...register('isSensitive')}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="profile-field-sensitive" className="ml-2 block text-sm text-gray-700">
            Mark as sensitive data
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : (mode === 'add' ? 'Add Field' : 'Update Field')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}