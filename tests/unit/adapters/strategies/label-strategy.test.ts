/**
 * Tests for Label Strategy Implementation
 */

import {
  LabelStrategy,
  LabelStrategyFactory
} from '../../../../src/adapters/strategies/label-strategy';
import { StrategyContext, StrategyExecutor } from '../../../../src/adapters/strategies/base-strategy';
import { LabelStrategyConfig } from '../../../../src/adapters/shared/adapter-config';
import { ExtractedFormSchema, FormFieldSchema } from '../../../../src/types';

// Mock the profile schema utility
jest.mock('../../../../src/utils/profile-schema', () => ({
  findCanonicalProfileKey: jest.fn((label: string, profileKeys: string[]) => {
    // Simple mock implementation for synonym matching
    const synonymMap: Record<string, string> = {
      'full name': 'Full Name',
      'complete name': 'Full Name',
      'email address': 'Email',
      'e-mail': 'Email',
      'telephone': 'Phone',
      'phone number': 'Phone'
    };
    
    const normalized = label.toLowerCase().trim();
    for (const [synonym, canonical] of Object.entries(synonymMap)) {
      if (normalized.includes(synonym) && profileKeys.includes(canonical)) {
        return canonical;
      }
    }
    return null;
  })
}));

// Mock label patterns
jest.mock('../../../../src/adapters/config/label-patterns', () => ({
  CONTACT_INFO_PATTERNS: [
    { patterns: ['first name', 'given name'], profileKey: 'First Name', confidence: 0.9 },
    { patterns: ['last name', 'family name', 'surname'], profileKey: 'Last Name', confidence: 0.9 },
    { patterns: ['email', 'email address'], profileKey: 'Email', confidence: 0.95 },
    { patterns: ['phone', 'telephone', 'mobile'], profileKey: 'Phone', confidence: 0.85 }
  ],
  ADDRESS_PATTERNS: [
    { patterns: ['address', 'street address'], profileKey: 'Address', confidence: 0.9 },
    { patterns: ['city', 'town'], profileKey: 'City', confidence: 0.9 },
    { patterns: ['state', 'province'], profileKey: 'State', confidence: 0.9 },
    { patterns: ['zip', 'postal code', 'zipcode'], profileKey: 'Zip Code', confidence: 0.9 }
  ],
  WORK_EXPERIENCE_PATTERNS: [
    { patterns: ['company', 'employer', 'organization'], profileKey: 'Company', confidence: 0.85 },
    { patterns: ['job title', 'position', 'role'], profileKey: 'Job Title', confidence: 0.85 },
    { patterns: ['start date', 'from date'], profileKey: 'Start Date', confidence: 0.8 },
    { patterns: ['end date', 'to date'], profileKey: 'End Date', confidence: 0.8 }
  ],
  APPLICATION_PATTERNS: [
    { patterns: ['cover letter', 'motivation letter'], profileKey: 'Cover Letter', confidence: 0.9 },
    { patterns: ['resume', 'cv', 'curriculum'], profileKey: 'Resume', confidence: 0.95 },
    { patterns: ['salary', 'compensation', 'expected salary'], profileKey: 'Salary', confidence: 0.8 }
  ],
  COMPREHENSIVE_PATTERNS: [
    // This would be a combination of all patterns above
    { patterns: ['first name', 'given name'], profileKey: 'First Name', confidence: 0.9 },
    { patterns: ['email', 'email address'], profileKey: 'Email', confidence: 0.95 },
    { patterns: ['phone', 'telephone'], profileKey: 'Phone', confidence: 0.85 },
    { patterns: ['address'], profileKey: 'Address', confidence: 0.9 }
  ]
}));

// Mock form schema with various label types
const mockFormSchema: ExtractedFormSchema = {
  url: 'https://test.com',
  fields: [
    {
      idx: 0,
      label: 'First Name',
      labelSource: 'for-attribute',
      labelConfidence: 0.9,
      selector: 'input[id="firstName"]',
      fallbackSelectors: [],
      elementType: 'input',
      attributes: { id: 'firstName', type: 'text' },
      options: null
    },
    {
      idx: 1,
      label: 'Family Name',
      labelSource: 'wrapping-label',
      labelConfidence: 0.85,
      selector: 'input[name="lastName"]',
      fallbackSelectors: [],
      elementType: 'input',
      attributes: { name: 'lastName', type: 'text' },
      options: null
    },
    {
      idx: 2,
      label: 'Email Address',
      labelSource: 'aria-label',
      labelConfidence: 0.95,
      selector: 'input[aria-label="Email Address"]',
      fallbackSelectors: [],
      elementType: 'input',
      attributes: { 'aria-label': 'Email Address', type: 'email' },
      options: null
    },
    {
      idx: 3,
      label: 'Telephone Number',
      labelSource: 'placeholder',
      labelConfidence: 0.7,
      selector: 'input[placeholder="Telephone Number"]',
      fallbackSelectors: [],
      elementType: 'input',
      attributes: { placeholder: 'Telephone Number', type: 'tel' },
      options: null
    },
    {
      idx: 4,
      label: 'Street Address',
      labelSource: 'for-attribute',
      labelConfidence: 0.9,
      selector: 'input[id="address"]',
      fallbackSelectors: [],
      elementType: 'input',
      attributes: { id: 'address', type: 'text' },
      options: null
    },
    {
      idx: 5,
      label: 'Complete Name',
      labelSource: 'wrapping-label',
      labelConfidence: 0.8,
      selector: 'input[name="fullName"]',
      fallbackSelectors: [],
      elementType: 'input',
      attributes: { name: 'fullName', type: 'text' },
      options: null
    },
    {
      idx: 6,
      label: 'CV Upload',
      labelSource: 'for-attribute',
      labelConfidence: 0.9,
      selector: 'input[type="file"]',
      fallbackSelectors: [],
      elementType: 'input',
      attributes: { type: 'file', accept: '.pdf,.doc,.docx' },
      options: null
    }
  ] as FormFieldSchema[],
  extractionTime: 150,
  metadata: {}
};

describe('LabelStrategy', () => {
  let context: StrategyContext;

  beforeEach(() => {
    context = {
      formSchema: mockFormSchema,
      profileKeys: ['First Name', 'Last Name', 'Email', 'Phone', 'Address', 'Full Name', 'Resume'],
      mappedIndices: new Set(),
      params: {}
    };
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      const config: LabelStrategyConfig = {
        patterns: [
          { patterns: ['first name'], profileKey: 'First Name' }
        ],
        defaultConfidence: 0.8,
        useSynonyms: true
      };

      const strategy = new LabelStrategy(config);
      
      expect(strategy.id).toBe('label-patterns');
      expect(strategy.name).toBe('Label Pattern Matching');
      expect(strategy.type).toBe('label');
    });
  });

  describe('executeStrategy', () => {
    it('should map fields by pattern matching', async () => {
      const config: LabelStrategyConfig = {
        patterns: [
          { patterns: ['first name', 'given name'], profileKey: 'First Name', confidence: 0.9 },
          { patterns: ['family name', 'surname'], profileKey: 'Last Name', confidence: 0.85 },
          { patterns: ['email', 'email address'], profileKey: 'Email', confidence: 0.95 }
        ],
        defaultConfidence: 0.8,
        useSynonyms: false
      };

      const strategy = new LabelStrategy(config);
      const result = await strategy.executeStrategy(context);

      expect(result).toHaveLength(3);
      
      // Should find "First Name" field
      const firstNameMapping = result.find(m => m.formFieldIdx === 0);
      expect(firstNameMapping).toBeDefined();
      expect(firstNameMapping?.profileKey).toBe('First Name');
      expect(firstNameMapping?.confidence).toBe(0.9);

      // Should find "Family Name" field (matches "family name" pattern)
      const familyNameMapping = result.find(m => m.formFieldIdx === 1);
      expect(familyNameMapping).toBeDefined();
      expect(familyNameMapping?.profileKey).toBe('Last Name');

      // Should find "Email Address" field
      const emailMapping = result.find(m => m.formFieldIdx === 2);
      expect(emailMapping).toBeDefined();
      expect(emailMapping?.profileKey).toBe('Email');
    });

    it('should use custom confidence for specific patterns', async () => {
      const config: LabelStrategyConfig = {
        patterns: [
          { patterns: ['email'], profileKey: 'Email', confidence: 0.98 },
          { patterns: ['first name'], profileKey: 'First Name' } // No confidence specified
        ],
        defaultConfidence: 0.75,
        useSynonyms: false
      };

      const strategy = new LabelStrategy(config);
      const result = await strategy.executeStrategy(context);

      const emailMapping = result.find(m => m.profileKey === 'Email');
      const firstNameMapping = result.find(m => m.profileKey === 'First Name');

      expect(emailMapping?.confidence).toBe(0.98);
      expect(firstNameMapping?.confidence).toBe(0.75); // Should use default
    });

    it('should handle synonym matching when enabled', async () => {
      const config: LabelStrategyConfig = {
        patterns: [
          { patterns: ['first name'], profileKey: 'First Name', confidence: 0.9 }
        ],
        defaultConfidence: 0.8,
        useSynonyms: true
      };

      const strategy = new LabelStrategy(config);
      const result = await strategy.executeStrategy(context);

      // Should find pattern matches
      const patternMatches = result.filter(m => m.confidence === 0.9);
      expect(patternMatches).toHaveLength(1);

      // Should find synonym matches with reduced confidence
      const synonymMatches = result.filter(m => m.confidence === 0.8 * 0.9); // defaultConfidence * 0.9
      expect(synonymMatches.length).toBeGreaterThan(0);

      // Should find "Complete Name" as synonym for "Full Name"
      const fullNameMapping = result.find(m => m.profileKey === 'Full Name');
      expect(fullNameMapping).toBeDefined();
    });

    it('should handle waterfall mapping correctly', async () => {
      const config: LabelStrategyConfig = {
        patterns: [
          { patterns: ['first name'], profileKey: 'First Name', confidence: 0.9 }
        ],
        defaultConfidence: 0.8,
        useSynonyms: false
      };

      // Mark first field as already mapped
      context.mappedIndices = new Set([0]);

      const strategy = new LabelStrategy(config);
      const result = await strategy.executeStrategy(context);

      // Should not map the already mapped field
      expect(result.every(m => m.formFieldIdx !== 0)).toBe(true);
    });

    it('should skip unavailable profile keys', async () => {
      const config: LabelStrategyConfig = {
        patterns: [
          { patterns: ['first name'], profileKey: 'First Name' },
          { patterns: ['middle name'], profileKey: 'Middle Name' }, // Not in profileKeys
          { patterns: ['email'], profileKey: 'Email' }
        ],
        defaultConfidence: 0.8,
        useSynonyms: false
      };

      const strategy = new LabelStrategy(config);
      const result = await strategy.executeStrategy(context);

      // Should skip mappings for unavailable profile keys
      expect(result.every(m => m.profileKey !== 'Middle Name')).toBe(true);
      expect(result.some(m => m.profileKey === 'First Name')).toBe(true);
      expect(result.some(m => m.profileKey === 'Email')).toBe(true);
    });

    it('should normalize labels for matching', async () => {
      const config: LabelStrategyConfig = {
        patterns: [
          { patterns: ['FIRST NAME'], profileKey: 'First Name' }, // Uppercase pattern
          { patterns: ['email   address'], profileKey: 'Email' } // Extra whitespace
        ],
        defaultConfidence: 0.8,
        useSynonyms: false
      };

      const strategy = new LabelStrategy(config);
      const result = await strategy.executeStrategy(context);

      // Should normalize both pattern and field label for matching
      expect(result.some(m => m.profileKey === 'First Name')).toBe(true);
      expect(result.some(m => m.profileKey === 'Email')).toBe(true);
    });

    it('should handle multiple patterns for same profile key', async () => {
      const config: LabelStrategyConfig = {
        patterns: [
          { patterns: ['first name', 'given name'], profileKey: 'First Name' }
        ],
        defaultConfidence: 0.8,
        useSynonyms: false
      };

      // Add another field with "given name" label
      const extendedSchema: ExtractedFormSchema = {
        ...mockFormSchema,
        fields: [
          ...mockFormSchema.fields,
          {
            idx: 7,
            label: 'Given Name',
            labelSource: 'for-attribute',
            labelConfidence: 0.9,
            selector: 'input[id="givenName"]',
            fallbackSelectors: [],
            elementType: 'input',
            attributes: { id: 'givenName', type: 'text' },
            options: null
          } as FormFieldSchema
        ]
      };

      const extendedContext: StrategyContext = {
        ...context,
        formSchema: extendedSchema
      };

      const strategy = new LabelStrategy(config);
      const result = await strategy.executeStrategy(extendedContext);

      const firstNameMappings = result.filter(m => m.profileKey === 'First Name');
      expect(firstNameMappings).toHaveLength(2); // Should match both fields
    });
  });

  describe('validate', () => {
    it('should validate correct configuration', () => {
      const config: LabelStrategyConfig = {
        patterns: [
          { patterns: ['first name'], profileKey: 'First Name' }
        ],
        defaultConfidence: 0.8,
        useSynonyms: true
      };

      const strategy = new LabelStrategy(config);
      const errors = strategy.validate();
      expect(errors).toEqual([]);
    });

    it('should detect empty patterns array', () => {
      const config: LabelStrategyConfig = {
        patterns: [],
        defaultConfidence: 0.8,
        useSynonyms: true
      };

      const strategy = new LabelStrategy(config);
      const errors = strategy.validate();
      expect(errors).toContain('At least one label pattern must be specified');
    });

    it('should detect invalid default confidence', () => {
      const config: LabelStrategyConfig = {
        patterns: [
          { patterns: ['first name'], profileKey: 'First Name' }
        ],
        defaultConfidence: 1.5,
        useSynonyms: true
      };

      const strategy = new LabelStrategy(config);
      const errors = strategy.validate();
      expect(errors).toContain('Default confidence must be between 0 and 1');
    });

    it('should detect invalid pattern configurations', () => {
      const config: LabelStrategyConfig = {
        patterns: [
          { patterns: [], profileKey: 'First Name' }, // Empty patterns array
          { patterns: ['email'], profileKey: '' }, // Empty profile key
          { patterns: ['phone'], profileKey: 'Phone', confidence: 1.5 }, // Invalid confidence
          { patterns: ['', 'address'], profileKey: 'Address' } // Empty pattern string
        ],
        defaultConfidence: 0.8,
        useSynonyms: true
      };

      const strategy = new LabelStrategy(config);
      const errors = strategy.validate();

      expect(errors).toContain('Pattern at index 0 must have at least one pattern string');
      expect(errors).toContain('Pattern at index 1 must have a profile key');
      expect(errors).toContain('Pattern at index 2 confidence must be between 0 and 1');
      expect(errors).toContain('Pattern 3.0 cannot be empty');
    });
  });

  describe('getConfig', () => {
    it('should return comprehensive configuration', () => {
      const config: LabelStrategyConfig = {
        patterns: [
          { patterns: ['first name', 'given name'], profileKey: 'First Name', confidence: 0.9 },
          { patterns: ['email'], profileKey: 'Email' }
        ],
        defaultConfidence: 0.8,
        useSynonyms: true
      };

      const strategy = new LabelStrategy(config);
      const strategyConfig = strategy.getConfig();

      expect(strategyConfig).toEqual({
        id: 'label-patterns',
        name: 'Label Pattern Matching',
        type: 'label',
        supportsWaterfall: true,
        patternCount: 2,
        defaultConfidence: 0.8,
        useSynonyms: true,
        patterns: [
          { profileKey: 'First Name', patternCount: 2, confidence: 0.9 },
          { profileKey: 'Email', patternCount: 1, confidence: undefined }
        ]
      });
    });
  });
});

describe('LabelStrategyFactory', () => {
  describe('createContactInfoStrategy', () => {
    it('should create contact info strategy with defaults', () => {
      const strategy = LabelStrategyFactory.createContactInfoStrategy();

      expect(strategy.id).toBe('label-patterns');
      expect(strategy.type).toBe('label');

      const config = strategy.getConfig();
      expect(config.defaultConfidence).toBe(0.8);
      expect(config.useSynonyms).toBe(true);
    });

    it('should allow custom confidence', () => {
      const strategy = LabelStrategyFactory.createContactInfoStrategy(0.85);
      const config = strategy.getConfig();
      expect(config.defaultConfidence).toBe(0.85);
    });
  });

  describe('createAddressStrategy', () => {
    it('should create address strategy', () => {
      const strategy = LabelStrategyFactory.createAddressStrategy();
      const config = strategy.getConfig();
      expect(config.defaultConfidence).toBe(0.8);
      expect(config.useSynonyms).toBe(true);
    });
  });

  describe('createWorkExperienceStrategy', () => {
    it('should create work experience strategy', () => {
      const strategy = LabelStrategyFactory.createWorkExperienceStrategy();
      const config = strategy.getConfig();
      expect(config.defaultConfidence).toBe(0.8);
    });
  });

  describe('createApplicationStrategy', () => {
    it('should create application strategy', () => {
      const strategy = LabelStrategyFactory.createApplicationStrategy();
      const config = strategy.getConfig();
      expect(config.defaultConfidence).toBe(0.8);
    });
  });

  describe('createComprehensiveStrategy', () => {
    it('should create comprehensive strategy', () => {
      const strategy = LabelStrategyFactory.createComprehensiveStrategy();
      const config = strategy.getConfig();
      expect(config.defaultConfidence).toBe(0.8);
      expect(config.useSynonyms).toBe(true);
    });
  });
});

describe('Integration Tests', () => {
  it('should work end-to-end with realistic label scenario', async () => {
    const context: StrategyContext = {
      formSchema: mockFormSchema,
      profileKeys: ['First Name', 'Last Name', 'Email', 'Phone', 'Address'],
      mappedIndices: new Set(),
      params: {}
    };

    // Create comprehensive label strategy
    const strategy = LabelStrategyFactory.createComprehensiveStrategy();
    const result = await strategy.execute(context);

    expect(result.mappings.length).toBeGreaterThan(0);
    expect(result.processingTime).toBeGreaterThan(0);
    expect(result.mappings.every(m => m.confidence > 0.6)).toBe(true);
    expect(result.mappings.every(m => m.reasoning.includes('Label Pattern Matching'))).toBe(true);
  });

  it('should handle complex label matching scenarios', async () => {
    const complexFormSchema: ExtractedFormSchema = {
      url: 'https://complex-form.com',
      fields: [
        {
          idx: 0,
          label: 'What is your first name?',
          labelSource: 'wrapping-label',
          labelConfidence: 0.8,
          selector: 'input[name="q1"]',
          fallbackSelectors: [],
          elementType: 'input',
          attributes: { name: 'q1', type: 'text' },
          options: null
        },
        {
          idx: 1,
          label: 'Please provide your e-mail address',
          labelSource: 'aria-label',
          labelConfidence: 0.9,
          selector: 'input[aria-label="Email field"]',
          fallbackSelectors: [],
          elementType: 'input',
          attributes: { 'aria-label': 'Email field', type: 'email' },
          options: null
        },
        {
          idx: 2,
          label: 'Phone/Mobile Number',
          labelSource: 'placeholder',
          labelConfidence: 0.7,
          selector: 'input[placeholder="Phone/Mobile Number"]',
          fallbackSelectors: [],
          elementType: 'input',
          attributes: { placeholder: 'Phone/Mobile Number', type: 'tel' },
          options: null
        }
      ] as FormFieldSchema[],
      extractionTime: 75,
      metadata: {}
    };

    const context: StrategyContext = {
      formSchema: complexFormSchema,
      profileKeys: ['First Name', 'Email', 'Phone'],
      mappedIndices: new Set(),
      params: {}
    };

    const strategy = LabelStrategyFactory.createContactInfoStrategy();
    const result = await strategy.execute(context);

    // Should find matches based on pattern recognition within labels
    expect(result.mappings).toHaveLength(3);
    
    const firstNameMapping = result.mappings.find(m => m.profileKey === 'First Name');
    const emailMapping = result.mappings.find(m => m.profileKey === 'Email');
    const phoneMapping = result.mappings.find(m => m.profileKey === 'Phone');

    expect(firstNameMapping).toBeDefined();
    expect(emailMapping).toBeDefined();
    expect(phoneMapping).toBeDefined();
  });

  it('should work with waterfall execution', async () => {
    const context: StrategyContext = {
      formSchema: mockFormSchema,
      profileKeys: ['First Name', 'Email', 'Phone'],
      mappedIndices: new Set(),
      params: {}
    };

    // Create multiple strategies
    const contactStrategy = LabelStrategyFactory.createContactInfoStrategy(0.9);
    const addressStrategy = LabelStrategyFactory.createAddressStrategy(0.8);

    const result = await StrategyExecutor.executeStrategies(
      [contactStrategy, addressStrategy], 
      context
    );

    // Should combine results from both strategies without duplicates
    expect(result.mappings.length).toBeGreaterThan(0);
    expect(result.results).toHaveLength(2);

    // Check for unique field mappings (no duplicates)
    const fieldIndices = result.mappings.map(m => m.formFieldIdx);
    const uniqueIndices = new Set(fieldIndices);
    expect(fieldIndices.length).toBe(uniqueIndices.size);
  });
});