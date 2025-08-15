import { useForm } from 'react-hook-form';
import { ProfileField, WorkExperience } from '../../types';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { Modal } from './common/Modal';

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
      type: initialField?.type || 'custom',
      isSensitive: initialField?.isSensitive || false
    }
  });

  const fieldType = watch('type');

  const onFormSubmit = async (data: FormData) => {
    try {
      let processedValue: string | WorkExperience[] = data.value;

      // Handle work experience as JSON if it's that type
      if (data.type === 'workExperience' && data.value) {
        try {
          processedValue = JSON.parse(data.value) as WorkExperience[];
        } catch {
          // If JSON parsing fails, keep as string
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
      console.error('Failed to submit field:', error);
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
          label="Field Label"
          {...register('label', { 
            required: 'Label is required',
            minLength: { value: 1, message: 'Label cannot be empty' }
          })}
          error={errors.label?.message}
          placeholder="e.g., First Name, LinkedIn URL"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Field Type
          </label>
          <select
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Value
          </label>
          {fieldType === 'workExperience' ? (
            <textarea
              {...register('value', { required: 'Value is required' })}
              rows={6}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder='JSON format: [{"title": "Software Engineer", "company": "Google", "location": "CA", "startDate": "2020-01", "endDate": "2023-01", "description": "Built things"}]'
            />
          ) : (
            <Input
              {...register('value', { required: 'Value is required' })}
              error={errors.value?.message}
              placeholder="Enter the field value"
            />
          )}
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            {...register('isSensitive')}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-700">
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