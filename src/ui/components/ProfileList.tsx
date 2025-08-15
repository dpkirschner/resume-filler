import { useState } from 'react';
import { ProfileField as ProfileFieldType } from '../../types';
import { ProfileField } from './ProfileField';
import { ProfileFieldForm } from './ProfileFieldForm';
import { Button } from './common/Button';

export interface ProfileListProps {
  fields: ProfileFieldType[];
  onAddField: (field: ProfileFieldType) => Promise<void>;
  onUpdateField: (index: number, field: Partial<ProfileFieldType>) => Promise<void>;
  onDeleteField: (index: number) => Promise<void>;
  isLoading?: boolean;
}

export function ProfileList({
  fields,
  onAddField,
  onUpdateField,
  onDeleteField,
  isLoading = false
}: ProfileListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingField, setEditingField] = useState<{ field: ProfileFieldType; index: number } | null>(null);

  const handleAddField = async (field: ProfileFieldType) => {
    await onAddField(field);
    setIsFormOpen(false);
  };

  const handleEditField = (index: number) => {
    setEditingField({ field: fields[index], index });
  };

  const handleUpdateField = async (field: ProfileFieldType) => {
    if (editingField) {
      await onUpdateField(editingField.index, field);
      setEditingField(null);
    }
  };

  const handleDeleteField = async (index: number) => {
    if (window.confirm('Are you sure you want to delete this field?')) {
      await onDeleteField(index);
    }
  };

  const groupedFields = fields.reduce((groups, field, index) => {
    const type = field.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push({ field, index });
    return groups;
  }, {} as Record<string, Array<{ field: ProfileFieldType; index: number }>>);

  const getGroupTitle = (type: string): string => {
    const titles = {
      personal: 'Personal Information',
      work: 'Professional Information',
      workExperience: 'Work Experience',
      custom: 'Custom Fields',
      eeo: 'EEO Information'
    };
    return titles[type as keyof typeof titles] || 'Other';
  };

  const getGroupDescription = (type: string): string => {
    const descriptions = {
      personal: 'Basic contact and personal details',
      work: 'Professional skills and qualifications',
      workExperience: 'Employment history and experience',
      custom: 'Custom fields you have added',
      eeo: 'Equal Employment Opportunity information'
    };
    return descriptions[type as keyof typeof descriptions] || '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Profile Fields</h2>
          <p className="text-sm text-gray-500">
            {fields.length} field{fields.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          Add Field
        </Button>
      </div>

      {/* Profile Fields */}
      {fields.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No profile fields yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Get started by adding your first profile field
          </p>
          <Button onClick={() => setIsFormOpen(true)}>
            Add Your First Field
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFields).map(([type, typeFields]) => (
            <div key={type} className="space-y-3">
              <div className="border-b border-gray-200 pb-2">
                <h3 className="text-sm font-medium text-gray-900">
                  {getGroupTitle(type)}
                </h3>
                <p className="text-xs text-gray-500">
                  {getGroupDescription(type)}
                </p>
              </div>
              
              <div className="space-y-3">
                {typeFields.map(({ field, index }) => (
                  <ProfileField
                    key={index}
                    field={field}
                    index={index}
                    onEdit={handleEditField}
                    onDelete={handleDeleteField}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Field Form */}
      <ProfileFieldForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleAddField}
        mode="add"
      />

      {/* Edit Field Form */}
      {editingField && (
        <ProfileFieldForm
          isOpen={true}
          onClose={() => setEditingField(null)}
          onSubmit={handleUpdateField}
          initialField={editingField.field}
          mode="edit"
        />
      )}
    </div>
  );
}