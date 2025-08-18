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
  'data-automation-id'?: string;
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

//=============================================================================
// MAPPING ENGINE TYPES
//=============================================================================

// Individual field mapping result
export interface FieldMapping {
  formFieldIdx: number; // Index in the original form schema
  profileKey: string; // Key from user profile to map to
  confidence: number; // 0-1 confidence score
  source: 'vendor' | 'heuristic' | 'llm'; // Which tier generated this mapping
  action: 'setValue' | 'selectByText' | 'selectByValue'; // DOM action to perform
  reasoning?: string; // Human-readable explanation for debugging/UI
}

// Complete mapping result for a form
export interface MappingResult {
  mappings: FieldMapping[]; // Successfully mapped fields
  unmappedFields: number[]; // Indices of fields that couldn't be mapped
  processingTime: number; // Milliseconds spent on mapping
  source: 'vendor' | 'heuristic' | 'llm' | 'hybrid'; // Primary mapping strategy used
  metadata?: {
    vendorAdapter?: string; // Name of adapter used (if vendor)
    heuristicStats?: HeuristicMappingStats; // Detailed heuristic scores
    fallbackReason?: string; // Why we fell back to this tier
  };
}

// Vendor adapter interface for ATS-specific mapping
export interface VendorAdapter {
  readonly name: string; // Human-readable adapter name
  readonly domains: string[]; // Domains this adapter handles
  readonly priority: number; // Higher priority = tried first
  canHandle(url: string): boolean; // Quick check if adapter applies
  mapFields(
    formSchema: ExtractedFormSchema, 
    profileKeys: string[]
  ): Promise<MappingResult>;
}

// Heuristic mapping configuration
export interface HeuristicWeights {
  exactMatch: number; // Weight for exact label/key match
  partialMatch: number; // Weight for substring/partial match
  autocompleteMatch: number; // Weight for autocomplete attribute match
  nameAttributeMatch: number; // Weight for name attribute match
  idAttributeMatch: number; // Weight for id attribute match
  typeBonus: number; // Bonus for input type alignment (email->email)
  synonymBonus: number; // Bonus for known synonyms
}

// Detailed scoring breakdown for heuristic mapping
export interface ScoreBreakdown {
  exactMatch: number;
  partialMatch: number;
  autocompleteMatch: number;
  nameAttributeMatch: number;
  idAttributeMatch: number;
  typeBonus: number;
  synonymBonus: number;
  totalScore: number;
}

// Statistics from heuristic mapping for analysis
export interface HeuristicMappingStats {
  totalFields: number;
  highConfidenceMatches: number; // confidence >= 0.8
  mediumConfidenceMatches: number; // 0.5 <= confidence < 0.8
  lowConfidenceMatches: number; // confidence < 0.5
  averageConfidence: number;
  processingTimeMs: number;
}

// Profile schema for anonymized LLM calls
export interface ProfileSchema {
  keys: string[]; // Just the profile field labels, no values
  types: Record<string, string>; // Field type mapping for context
}

// LLM mapping payload (anonymized)
export interface LLMappingPayload {
  formSchema: {
    idx: number;
    label: string;
    attributes: FormFieldAttributes;
    elementType: string;
    options?: SelectOption[];
  }[];
  profileSchema: ProfileSchema;
}

// LLM mapping response
export interface LLMappingResponse {
  mappings: {
    idx: number;
    profileKey: string;
    action: FieldMapping['action'];
    confidence: number;
    reasoning: string;
  }[];
  unmappedIndices: number[];
}

//=============================================================================
// BACKGROUND SCRIPT COMMUNICATION TYPES
//=============================================================================

export type ExtractorMessage = 
  | { type: 'EXTRACT_FORMS'; payload: { forceExtraction?: boolean } }
  | { type: 'FORM_SCHEMA_EXTRACTED'; payload: ExtractedFormSchema }
  | { type: 'MAPPING_READY'; payload: MappingResult }
  | { type: 'MAPPING_ERROR'; payload: { error: string; details?: Record<string, unknown> } }
  | { type: 'EXTRACTION_ERROR'; payload: { error: string; details?: Record<string, unknown> } };