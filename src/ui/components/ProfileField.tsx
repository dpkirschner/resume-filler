import { useState } from 'react';
import { ProfileField as ProfileFieldType } from '../../types';
import { Button } from './common/Button';

export interface ProfileFieldProps {
  field: ProfileFieldType;
  index: number;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

export function ProfileField({ field, index, onEdit, onDelete }: ProfileFieldProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatValue = (value: ProfileFieldType['value']): string => {
    if (Array.isArray(value)) {
      return `${value.length} work experience entries`;
    }
    return typeof value === 'string' ? value : '';
  };

  const truncateValue = (text: string, maxLength: number = 50): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getTypeColor = (type: ProfileFieldType['type']): string => {
    const colors = {
      personal: 'bg-blue-100 text-blue-800',
      work: 'bg-green-100 text-green-800', 
      custom: 'bg-purple-100 text-purple-800',
      eeo: 'bg-yellow-100 text-yellow-800',
      workExperience: 'bg-indigo-100 text-indigo-800'
    };
    return colors[type] || colors.custom;
  };

  const formattedValue = formatValue(field.value);
  const displayValue = isExpanded ? formattedValue : truncateValue(formattedValue);

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {field.label}
            </h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(field.type)}`}>
              {field.type}
            </span>
            {field.isSensitive && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                Sensitive
              </span>
            )}
          </div>
          
          <div className="text-sm text-gray-600">
            {displayValue}
            {formattedValue.length > 50 && (
              <button
                type="button"
                className="ml-1 text-blue-600 hover:text-blue-800"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="secondary"
            size="small"
            onClick={() => onEdit(index)}
            title="Edit field"
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="small"
            onClick={() => onDelete(index)}
            title="Delete field"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Show work experience details when expanded */}
      {isExpanded && Array.isArray(field.value) && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Work Experience Details:</h4>
          <div className="space-y-2">
            {field.value.map((exp, idx) => (
              <div key={idx} className="bg-gray-50 p-2 rounded text-xs">
                <div className="font-medium">{exp.title} at {exp.company}</div>
                <div className="text-gray-600">{exp.location} • {exp.startDate} - {exp.endDate}</div>
                {exp.description && (
                  <div className="mt-1 text-gray-700">{exp.description}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}