/**
 * Label Pattern Configuration
 * Centralized pattern definitions for label-based field mapping
 * 
 * These patterns can be easily externalized to YAML/JSON files in the future
 */

import { LabelStrategyConfig } from '../shared/adapter-config';

export type LabelPatternConfig = LabelStrategyConfig['patterns'];

/**
 * Contact information field patterns
 */
export const CONTACT_INFO_PATTERNS: LabelPatternConfig = [
  {
    patterns: ['first name', 'given name', 'fname'],
    profileKey: 'First Name'
  },
  {
    patterns: ['last name', 'family name', 'surname', 'lname'],
    profileKey: 'Last Name'
  },
  {
    patterns: ['email', 'email address', 'e-mail'],
    profileKey: 'Email'
  },
  {
    patterns: ['phone', 'telephone', 'mobile', 'cell'],
    profileKey: 'Phone'
  }
];

/**
 * Address field patterns
 */
export const ADDRESS_PATTERNS: LabelPatternConfig = [
  {
    patterns: ['street', 'address', 'address line 1', 'address1'],
    profileKey: 'Address'
  },
  {
    patterns: ['address line 2', 'address2', 'apt', 'apartment', 'suite'],
    profileKey: 'Address Line 2'
  },
  {
    patterns: ['city', 'town', 'locality'],
    profileKey: 'City'
  },
  {
    patterns: ['state', 'province', 'region'],
    profileKey: 'State'
  },
  {
    patterns: ['zip', 'postal', 'postcode', 'zip code'],
    profileKey: 'Zip Code'
  },
  {
    patterns: ['country', 'nation'],
    profileKey: 'Country'
  }
];

/**
 * Work experience field patterns
 */
export const WORK_EXPERIENCE_PATTERNS: LabelPatternConfig = [
  {
    patterns: ['job title', 'position', 'title', 'role'],
    profileKey: 'Current Job Title'
  },
  {
    patterns: ['company', 'employer', 'organization'],
    profileKey: 'Current Company'
  },
  {
    patterns: ['current location', 'work location', 'location'],
    profileKey: 'Current Location'
  },
  {
    patterns: ['salary', 'current salary', 'compensation'],
    profileKey: 'Current Salary'
  },
  {
    patterns: ['desired salary', 'expected salary', 'salary expectation'],
    profileKey: 'Desired Salary'
  }
];

/**
 * Application-specific field patterns
 */
export const APPLICATION_PATTERNS: LabelPatternConfig = [
  {
    patterns: ['cover letter', 'motivation letter'],
    profileKey: 'Cover Letter'
  },
  {
    patterns: ['resume', 'cv', 'curriculum vitae'],
    profileKey: 'Resume'
  },
  {
    patterns: ['linkedin', 'linkedin profile'],
    profileKey: 'LinkedIn'
  },
  {
    patterns: ['portfolio', 'website', 'personal website'],
    profileKey: 'Portfolio'
  },
  {
    patterns: ['start date', 'available', 'availability'],
    profileKey: 'Available Start Date'
  },
  {
    patterns: ['work authorization', 'visa status', 'eligibility'],
    profileKey: 'Work Authorization'
  }
];

/**
 * Combined pattern sets for easy access
 */
export const ALL_LABEL_PATTERNS = {
  CONTACT_INFO: CONTACT_INFO_PATTERNS,
  ADDRESS: ADDRESS_PATTERNS,
  WORK_EXPERIENCE: WORK_EXPERIENCE_PATTERNS,
  APPLICATION: APPLICATION_PATTERNS
} as const;

/**
 * Comprehensive pattern collection combining all categories
 */
export const COMPREHENSIVE_PATTERNS: LabelPatternConfig = [
  ...CONTACT_INFO_PATTERNS,
  ...ADDRESS_PATTERNS,
  ...WORK_EXPERIENCE_PATTERNS,
  ...APPLICATION_PATTERNS
];