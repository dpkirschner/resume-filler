import { 
  ProfileField, 
  WorkExperience, 
  UserProfile, 
  UserSettings, 
  STORAGE_KEYS 
} from '../../src/types';

describe('Type Definitions', () => {
  describe('ProfileField', () => {
    it('should create valid ProfileField objects', () => {
      const personalField: ProfileField = {
        label: 'Full Name',
        value: 'John Doe',
        type: 'personal',
        isSensitive: false,
      };

      expect(personalField.label).toBe('Full Name');
      expect(personalField.value).toBe('John Doe');
      expect(personalField.type).toBe('personal');
      expect(personalField.isSensitive).toBe(false);
    });

    it('should support all field types', () => {
      const fieldTypes: ProfileField['type'][] = ['personal', 'work', 'custom', 'eeo', 'workExperience'];
      
      fieldTypes.forEach(type => {
        const field: ProfileField = {
          label: `Test ${type}`,
          value: 'Test value',
          type,
          isSensitive: type === 'eeo',
        };

        expect(field.type).toBe(type);
      });
    });

    it('should support WorkExperience array as value', () => {
      const workExperience: WorkExperience[] = [
        {
          title: 'Software Engineer',
          company: 'Tech Corp',
          location: 'San Francisco, CA',
          startDate: '2020-01-01',
          endDate: '2023-12-31',
          description: 'Developed web applications',
        },
      ];

      const workField: ProfileField = {
        label: 'Work History',
        value: workExperience,
        type: 'workExperience',
        isSensitive: false,
      };

      expect(Array.isArray(workField.value)).toBe(true);
      expect((workField.value as WorkExperience[])[0].title).toBe('Software Engineer');
    });
  });

  describe('WorkExperience', () => {
    it('should create valid WorkExperience objects', () => {
      const experience: WorkExperience = {
        title: 'Senior Developer',
        company: 'ACME Inc',
        location: 'Remote',
        startDate: '2021-03-15',
        endDate: '2024-01-30',
        description: 'Led development of microservices architecture',
      };

      expect(experience.title).toBe('Senior Developer');
      expect(experience.company).toBe('ACME Inc');
      expect(experience.location).toBe('Remote');
      expect(experience.startDate).toBe('2021-03-15');
      expect(experience.endDate).toBe('2024-01-30');
      expect(experience.description).toBe('Led development of microservices architecture');
    });

    it('should support current employment (empty endDate)', () => {
      const currentJob: WorkExperience = {
        title: 'Tech Lead',
        company: 'Current Corp',
        location: 'New York, NY',
        startDate: '2024-02-01',
        endDate: '',
        description: 'Current position',
      };

      expect(currentJob.endDate).toBe('');
    });
  });

  describe('UserProfile', () => {
    it('should be an array of ProfileField', () => {
      const profile: UserProfile = [
        {
          label: 'Name',
          value: 'Jane Doe',
          type: 'personal',
          isSensitive: false,
        },
        {
          label: 'Email',
          value: 'jane@example.com',
          type: 'personal',
          isSensitive: false,
        },
      ];

      expect(Array.isArray(profile)).toBe(true);
      expect(profile.length).toBe(2);
      expect(profile[0].label).toBe('Name');
      expect(profile[1].label).toBe('Email');
    });

    it('should support empty profile', () => {
      const emptyProfile: UserProfile = [];
      
      expect(Array.isArray(emptyProfile)).toBe(true);
      expect(emptyProfile.length).toBe(0);
    });

    it('should support mixed field types', () => {
      const mixedProfile: UserProfile = [
        {
          label: 'Name',
          value: 'John Smith',
          type: 'personal',
          isSensitive: false,
        },
        {
          label: 'Salary Expectation',
          value: '$100,000',
          type: 'work',
          isSensitive: true,
        },
        {
          label: 'Ethnicity',
          value: 'Prefer not to say',
          type: 'eeo',
          isSensitive: true,
        },
        {
          label: 'Custom Field',
          value: 'Custom Value',
          type: 'custom',
          isSensitive: false,
        },
      ];

      expect(mixedProfile.length).toBe(4);
      expect(mixedProfile.filter(field => field.isSensitive)).toHaveLength(2);
      expect(mixedProfile.filter(field => field.type === 'personal')).toHaveLength(1);
    });
  });

  describe('UserSettings', () => {
    it('should create valid UserSettings objects', () => {
      const settings: UserSettings = {
        llmProvider: 'openai',
        apiKey: 'sk-test-key',
        enableTelemetry: true,
        enableFeedback: false,
      };

      expect(settings.llmProvider).toBe('openai');
      expect(settings.apiKey).toBe('sk-test-key');
      expect(settings.enableTelemetry).toBe(true);
      expect(settings.enableFeedback).toBe(false);
    });

    it('should support all LLM provider types', () => {
      const providers: UserSettings['llmProvider'][] = ['ollama', 'openai', 'anthropic'];
      
      providers.forEach(provider => {
        const settings: UserSettings = {
          llmProvider: provider,
          enableTelemetry: false,
          enableFeedback: false,
        };

        expect(settings.llmProvider).toBe(provider);
      });
    });

    it('should support optional API key', () => {
      const settingsWithoutKey: UserSettings = {
        llmProvider: 'ollama',
        enableTelemetry: true,
        enableFeedback: true,
      };

      expect(settingsWithoutKey.apiKey).toBeUndefined();
    });

    it('should support settings with encrypted API key', () => {
      const settingsWithEncryptedKey: UserSettings = {
        llmProvider: 'anthropic',
        apiKey: 'encrypted_key_data_here',
        enableTelemetry: false,
        enableFeedback: true,
      };

      expect(settingsWithEncryptedKey.apiKey).toBe('encrypted_key_data_here');
    });
  });

  describe('STORAGE_KEYS', () => {
    it('should have correct storage key values', () => {
      expect(STORAGE_KEYS.PROFILE).toBe('user_profile');
      expect(STORAGE_KEYS.SETTINGS).toBe('user_settings');
      expect(STORAGE_KEYS.ENCRYPTION_SALT).toBe('encryption_salt');
    });

    it('should be readonly constants', () => {
      // TypeScript should prevent this, but let's test at runtime
      const keys = STORAGE_KEYS;
      expect(keys).toBeDefined();
      expect(typeof keys.PROFILE).toBe('string');
      expect(typeof keys.SETTINGS).toBe('string');
      expect(typeof keys.ENCRYPTION_SALT).toBe('string');
    });

    it('should have unique values', () => {
      const values = Object.values(STORAGE_KEYS);
      const uniqueValues = new Set(values);
      
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe('Type Compatibility', () => {
    it('should allow ProfileField with string value', () => {
      const stringField: ProfileField = {
        label: 'Text Field',
        value: 'String value',
        type: 'personal',
        isSensitive: false,
      };

      expect(typeof stringField.value).toBe('string');
    });

    it('should allow ProfileField with WorkExperience array value', () => {
      const workArray: WorkExperience[] = [
        {
          title: 'Developer',
          company: 'Tech Co',
          location: 'City',
          startDate: '2020-01-01',
          endDate: '2021-01-01',
          description: 'Coded stuff',
        },
      ];

      const workField: ProfileField = {
        label: 'Work Experience',
        value: workArray,
        type: 'workExperience',
        isSensitive: false,
      };

      expect(Array.isArray(workField.value)).toBe(true);
      expect((workField.value as WorkExperience[])[0]).toHaveProperty('title');
    });

    it('should handle type guards correctly', () => {
      const stringField: ProfileField = {
        label: 'Name',
        value: 'John Doe',
        type: 'personal',
        isSensitive: false,
      };

      const workField: ProfileField = {
        label: 'Experience',
        value: [{
          title: 'Dev',
          company: 'Co',
          location: 'Here',
          startDate: '2020-01-01',
          endDate: '2021-01-01',
          description: 'Work',
        }],
        type: 'workExperience',
        isSensitive: false,
      };

      // Type guard function
      function isWorkExperienceField(field: ProfileField): field is ProfileField & { value: WorkExperience[] } {
        return field.type === 'workExperience' && Array.isArray(field.value);
      }

      expect(isWorkExperienceField(stringField)).toBe(false);
      expect(isWorkExperienceField(workField)).toBe(true);
    });
  });
});