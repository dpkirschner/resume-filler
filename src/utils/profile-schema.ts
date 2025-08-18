/**
 * Profile Schema Utilities
 * Extracts anonymized profile schemas for mapping engines while preserving privacy
 */

import { UserProfile, ProfileSchema, WorkExperience } from '../types';

/**
 * Extracts an anonymized schema from a user profile
 * Only includes field labels and types - no user values
 */
export function extractProfileSchema(userProfile: UserProfile): ProfileSchema {
  const keys: string[] = [];
  const types: Record<string, string> = {};

  for (const field of userProfile) {
    keys.push(field.label);
    
    // Determine field type for mapping context
    if (field.type === 'workExperience') {
      types[field.label] = 'workExperience';
      
      // Add work experience sub-fields for granular mapping
      if (Array.isArray(field.value) && field.value.length > 0) {
        const workExp = field.value[0] as WorkExperience;
        Object.keys(workExp).forEach(subKey => {
          const compositeKey = `${field.label}.${subKey}`;
          keys.push(compositeKey);
          types[compositeKey] = 'workExperienceField';
        });
      }
    } else {
      types[field.label] = field.type;
    }
  }

  return { keys, types };
}

/**
 * Gets just the profile keys for simple matching scenarios
 */
export function getProfileKeys(userProfile: UserProfile): string[] {
  return extractProfileSchema(userProfile).keys;
}

/**
 * Checks if a profile key represents sensitive data
 * Used to apply extra confirmation for EEO fields
 */
export function isProfileKeySensitive(userProfile: UserProfile, profileKey: string): boolean {
  const field = userProfile.find(f => f.label === profileKey);
  return field?.isSensitive ?? false;
}

/**
 * Gets the profile field type for a given key
 */
export function getProfileKeyType(userProfile: UserProfile, profileKey: string): string | undefined {
  // Handle work experience sub-fields
  if (profileKey.includes('.')) {
    const [parentKey] = profileKey.split('.');
    const field = userProfile.find(f => f.label === parentKey);
    return field?.type === 'workExperience' ? 'workExperienceField' : undefined;
  }
  
  const field = userProfile.find(f => f.label === profileKey);
  return field?.type;
}

/**
 * Validates that all required profile keys exist
 * Used to ensure mapping results reference valid profile data
 */
export function validateProfileKeys(userProfile: UserProfile, keys: string[]): {
  valid: string[];
  invalid: string[];
} {
  const schema = extractProfileSchema(userProfile);
  const validKeys = new Set(schema.keys);
  
  const valid: string[] = [];
  const invalid: string[] = [];
  
  for (const key of keys) {
    if (validKeys.has(key)) {
      valid.push(key);
    } else {
      invalid.push(key);
    }
  }
  
  return { valid, invalid };
}

/**
 * Profile field synonyms for improved heuristic matching
 * Maps alternative labels to canonical profile keys
 */
export const PROFILE_SYNONYMS: Record<string, string[]> = {
  'First Name': ['Given Name', 'Forename', 'First', 'fname'],
  'Last Name': ['Surname', 'Family Name', 'Last', 'lname'],
  'Email': ['Email Address', 'E-mail', 'Contact Email', 'Primary Email'],
  'Phone': ['Phone Number', 'Telephone', 'Mobile', 'Contact Number'],
  'Address': ['Street Address', 'Home Address', 'Mailing Address'],
  'City': ['Town', 'Municipality', 'Locality'],
  'State': ['Province', 'Region', 'Territory'],
  'Country': ['Nation', 'Nationality'],
  'Zip Code': ['Postal Code', 'ZIP', 'Post Code'],
};

/**
 * Finds canonical profile key for a given form label using synonyms
 */
export function findCanonicalProfileKey(formLabel: string, profileKeys: string[]): string | null {
  const normalizedFormLabel = formLabel.toLowerCase().trim();
  
  // Direct match first
  for (const key of profileKeys) {
    if (key.toLowerCase() === normalizedFormLabel) {
      return key;
    }
  }
  
  // Synonym matching
  for (const [canonicalKey, synonyms] of Object.entries(PROFILE_SYNONYMS)) {
    if (profileKeys.includes(canonicalKey)) {
      for (const synonym of synonyms) {
        if (synonym.toLowerCase() === normalizedFormLabel) {
          return canonicalKey;
        }
      }
    }
  }
  
  return null;
}