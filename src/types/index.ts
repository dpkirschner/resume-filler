// Core data model types from docs/data_model.md

export interface ProfileField {
  label: string;
  value: string | WorkExperience[];
  type: 'personal' | 'work' | 'custom' | 'eeo' | 'workExperience';
  isSensitive: boolean;
}

export interface WorkExperience {
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

export type UserProfile = ProfileField[];

export interface UserSettings {
  llmProvider: 'ollama' | 'openai' | 'anthropic';
  apiKey?: string; // Always encrypted when stored
  enableTelemetry: boolean;
  enableFeedback: boolean;
}

export interface StorageKeys {
  PROFILE: 'user_profile';
  SETTINGS: 'user_settings';
  ENCRYPTION_SALT: 'encryption_salt';
}

export const STORAGE_KEYS: StorageKeys = {
  PROFILE: 'user_profile',
  SETTINGS: 'user_settings', 
  ENCRYPTION_SALT: 'encryption_salt'
} as const;