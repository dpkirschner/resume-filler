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

// Form extraction types for Task 4
export interface FormFieldSchema {
  idx: number;
  label: string;
  labelSource: 'for-attribute' | 'wrapping-label' | 'aria-label' | 'aria-labelledby' | 'placeholder' | 'geometric-proximity' | 'fallback';
  labelConfidence: number; // 0-1 score for label accuracy
  selector: string;
  fallbackSelectors: string[]; // Backup selectors for reliability
  elementType: 'input' | 'select' | 'textarea'; // Element tag name for mapping engine
  attributes: FormFieldAttributes;
  options: SelectOption[] | null;
  boundingRect?: DOMRect; // For debugging and validation
}

export interface FormFieldAttributes {
  name?: string;
  id?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autocomplete?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export interface SelectOption {
  value: string;
  text: string;
}

export interface ExtractedFormSchema {
  fields: FormFieldSchema[];
  url: string;
  timestamp: number;
  extractionSource: 'manual' | 'mutation-observer';
}

export interface GeometricValidationConfig {
  maxVerticalDistance: number; // 50px
  maxHorizontalDistance: number; // 200px
  sameRowTolerance: number; // 10px
}

export interface LabelResult {
  label: string;
  confidence: number; // 0-1
  source: FormFieldSchema['labelSource'];
  debug?: string;
}

type ManualStrategyAttribute = 
  | 'testid' 
  | 'cy' 
  | 'test' 
  | 'automation-id' 
  | 'id' 
  | 'name' 
  | 'autocomplete';

export type ManualSource = `manual-${ManualStrategyAttribute}` | `manual-${ManualStrategyAttribute}-tag`;

export interface SelectorCandidate {
  selector: string;
  confidence: number; // 0-1
  source: ManualSource | 'library' | 'structural';
}

export interface SelectorResult {
  primary: string;
  fallbacks: string[];
  confidence: number;
}

// Background script communication types
export type ExtractorMessage = 
  | { type: 'EXTRACT_FORMS'; payload: { forceExtraction?: boolean } }
  | { type: 'FORM_SCHEMA_EXTRACTED'; payload: ExtractedFormSchema }
  | { type: 'MAPPING_READY'; payload: Record<string, unknown> }
  | { type: 'EXTRACTION_ERROR'; payload: { error: string; details?: Record<string, unknown> } };