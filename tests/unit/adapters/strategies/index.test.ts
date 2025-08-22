/**
 * Tests for Strategies Index and Integration
 * Validates that all strategies are properly exported and work together
 */

import {
  // Base strategy exports
  BaseStrategy,
  StrategyFactory,
  StrategyExecutor,
  type MappingStrategy,
  type StrategyContext,
  type StrategyResult,
  
  // Strategy implementations
  AttributeStrategy,
  AttributeStrategyFactory,
  LabelStrategy,
  LabelStrategyFactory,
  CustomStrategy,
  CustomStrategyFactory,
  type CustomMappingFunction,
  
  // Utilities and constants
  STRATEGY_TYPES,
  StrategyBuilder,
  COMMON_STRATEGIES
} from '../../../../src/adapters/strategies/index';

import { ExtractedFormSchema, FormFieldSchema, FieldMapping } from '../../../../src/types';
import { LabelStrategyConfig, AttributeStrategyConfig, CustomStrategyConfig } from '../../../../src/adapters/shared/adapter-config';

// Mock form schema for integration testing
const mockFormSchema: ExtractedFormSchema = {
  url: 'https://integration-test.com',
  fields: [
    {
      idx: 0,
      label: 'First Name',
      labelSource: 'for-attribute',
      labelConfidence: 0.9,
      selector: 'input[name="firstName"]',
      fallbackSelectors: [],
      elementType: 'input',
      attributes: { name: 'firstName', type: 'text', autocomplete: 'given-name' },
      options: null
    },
    {
      idx: 1,
      label: 'Last Name',
      labelSource: 'for-attribute',
      labelConfidence: 0.9,
      selector: 'input[name="lastName"]',
      fallbackSelectors: [],
      elementType: 'input',
      attributes: { name: 'lastName', type: 'text', autocomplete: 'family-name' },
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
      attributes: { 'aria-label': 'Email Address', type: 'email', autocomplete: 'email' },
      options: null
    },
    {
      idx: 3,
      label: 'Phone Number',
      labelSource: 'placeholder',
      labelConfidence: 0.7,
      selector: 'input[placeholder="Phone Number"]',
      fallbackSelectors: [],
      elementType: 'input',
      attributes: { placeholder: 'Phone Number', type: 'tel', autocomplete: 'tel' },
      options: null
    },
    {
      idx: 4,
      label: 'Upload Resume',
      labelSource: 'for-attribute',
      labelConfidence: 0.9,
      selector: 'input[type="file"]',
      fallbackSelectors: [],
      elementType: 'input',
      attributes: { type: 'file', accept: '.pdf,.doc,.docx' },
      options: null
    }
  ] as FormFieldSchema[],
  extractionTime: 120,
  metadata: { source: 'integration-test' }
};

// Mock profile schema and label patterns as before
jest.mock('../../../../src/utils/profile-schema', () => ({
  findCanonicalProfileKey: jest.fn((label: string, profileKeys: string[]) => {
    const synonyms: Record<string, string> = {
      'email address': 'Email',
      'phone number': 'Phone'
    };
    const normalized = label.toLowerCase().trim();
    for (const [synonym, canonical] of Object.entries(synonyms)) {
      if (normalized.includes(synonym) && profileKeys.includes(canonical)) {
        return canonical;
      }
    }
    return null;
  })
}));

jest.mock('../../../../src/adapters/config/label-patterns', () => ({
  CONTACT_INFO_PATTERNS: [
    { patterns: ['first name'], profileKey: 'First Name', confidence: 0.9 },
    { patterns: ['email'], profileKey: 'Email', confidence: 0.95 },
    { patterns: ['phone'], profileKey: 'Phone', confidence: 0.85 }
  ],
  ADDRESS_PATTERNS: [],
  WORK_EXPERIENCE_PATTERNS: [],
  APPLICATION_PATTERNS: [],
  COMPREHENSIVE_PATTERNS: [
    { patterns: ['first name'], profileKey: 'First Name', confidence: 0.9 },
    { patterns: ['email'], profileKey: 'Email', confidence: 0.95 }
  ]
}));

describe('Strategies Index Exports', () => {
  it('should export all base strategy components', () => {
    expect(BaseStrategy).toBeDefined();
    expect(StrategyFactory).toBeDefined();
    expect(StrategyExecutor).toBeDefined();
  });

  it('should export all strategy implementations', () => {
    expect(AttributeStrategy).toBeDefined();
    expect(AttributeStrategyFactory).toBeDefined();
    expect(LabelStrategy).toBeDefined();
    expect(LabelStrategyFactory).toBeDefined();
    expect(CustomStrategy).toBeDefined();
    expect(CustomStrategyFactory).toBeDefined();
  });

  it('should export utility constants and builders', () => {
    expect(STRATEGY_TYPES).toBeDefined();
    expect(STRATEGY_TYPES.ATTRIBUTE).toBe('attribute');
    expect(STRATEGY_TYPES.LABEL).toBe('label');
    expect(STRATEGY_TYPES.CUSTOM).toBe('custom');
    
    expect(StrategyBuilder).toBeDefined();
    expect(COMMON_STRATEGIES).toBeDefined();
  });

  it('should export type definitions', () => {
    // TypeScript compilation ensures types are available
    const context: StrategyContext = {
      formSchema: mockFormSchema,
      profileKeys: ['First Name'],
      mappedIndices: new Set(),
      params: {}
    };
    
    expect(context).toBeDefined();
  });
});

describe('StrategyBuilder', () => {
  describe('validateConfig', () => {
    it('should validate correct strategy configuration', () => {
      const validConfig = {
        id: 'test-strategy',
        type: 'attribute',
        order: 1,
        enabled: true,
        config: {
          attribute: 'name',
          mappings: { 'test': 'Test' },
          confidence: 0.8,
          matchType: 'exact',
          normalize: true
        }
      };

      const errors = StrategyBuilder.validateConfig(validConfig);
      expect(errors).toEqual([]);
    });

    it('should detect missing required fields', () => {
      const invalidConfig = {
        // Missing id, type, order
        enabled: true,
        config: {}
      };

      const errors = StrategyBuilder.validateConfig(invalidConfig);
      expect(errors).toContain('Strategy type is required');
      expect(errors).toContain('Strategy ID is required');
      expect(errors).toContain('Strategy order must be a non-negative number');
    });

    it('should detect invalid values', () => {
      const invalidConfig = {
        id: '',
        type: 'attribute',
        order: -1,
        enabled: true
        // Missing config
      };

      const errors = StrategyBuilder.validateConfig(invalidConfig);
      expect(errors).toContain('Strategy ID is required');
      expect(errors).toContain('Strategy order must be a non-negative number');
      expect(errors).toContain('Strategy configuration is required');
    });

    it('should handle non-object input', () => {
      const errors = StrategyBuilder.validateConfig(null);
      expect(errors).toContain('Config must be an object');
    });
  });
});

describe('COMMON_STRATEGIES', () => {
  it('should provide valid name attribute strategy', () => {
    const nameStrategy = COMMON_STRATEGIES.NAME_ATTRIBUTE;
    
    expect(nameStrategy.id).toBe('name-attribute');
    expect(nameStrategy.type).toBe('attribute');
    expect(nameStrategy.enabled).toBe(true);
    expect(nameStrategy.config.attribute).toBe('name');
    expect(nameStrategy.config.confidence).toBe(0.9);
  });

  it('should provide valid autocomplete attribute strategy', () => {
    const autocompleteStrategy = COMMON_STRATEGIES.AUTOCOMPLETE_ATTRIBUTE;
    
    expect(autocompleteStrategy.id).toBe('autocomplete-attribute');
    expect(autocompleteStrategy.config.attribute).toBe('autocomplete');
    expect(autocompleteStrategy.config.confidence).toBe(0.95);
    expect(autocompleteStrategy.config.matchType).toBe('exact');
  });

  it('should provide valid contact labels strategy', () => {
    const contactStrategy = COMMON_STRATEGIES.CONTACT_LABELS;
    
    expect(contactStrategy.id).toBe('contact-labels');
    expect(contactStrategy.type).toBe('label');
    expect(contactStrategy.config.patterns).toBeDefined();
    expect(contactStrategy.config.defaultConfidence).toBe(0.8);
  });
});

describe('Multi-Strategy Integration', () => {
  let context: StrategyContext;

  beforeEach(() => {
    context = {
      formSchema: mockFormSchema,
      profileKeys: ['First Name', 'Last Name', 'Email', 'Phone', 'Resume'],
      mappedIndices: new Set(),
      params: {}
    };
  });

  it('should execute all strategy types together with waterfall', async () => {
    // Create one strategy of each type
    const attributeStrategy = AttributeStrategyFactory.createNameStrategy({
      'firstName': 'First Name',
      'lastName': 'Last Name'
    });

    const labelStrategy = LabelStrategyFactory.createContactInfoStrategy();

    const customStrategy = CustomStrategyFactory.createFileUploadStrategy();

    const strategies = [attributeStrategy, labelStrategy, customStrategy];
    const result = await StrategyExecutor.executeStrategies(strategies, context);

    expect(result.mappings.length).toBeGreaterThan(0);
    expect(result.results).toHaveLength(3);
    expect(result.totalTime).toBeGreaterThan(0);

    // Verify no duplicate field mappings (waterfall behavior)
    const fieldIndices = result.mappings.map(m => m.formFieldIdx);
    const uniqueIndices = new Set(fieldIndices);
    expect(fieldIndices.length).toBe(uniqueIndices.size);
  });

  it('should demonstrate strategy priority with common configurations', async () => {
    // Create multiple attribute strategies with different priorities
    const autocompleteStrategy = new AttributeStrategy({
      attribute: 'autocomplete',
      mappings: {
        'given-name': 'First Name',
        'family-name': 'Last Name',
        'email': 'Email',
        'tel': 'Phone'
      },
      confidence: 0.95,
      matchType: 'exact',
      normalize: false
    });

    const nameStrategy = new AttributeStrategy({
      attribute: 'name',
      mappings: {
        'firstName': 'First Name',
        'lastName': 'Last Name'
      },
      confidence: 0.85,
      matchType: 'contains',
      normalize: true
    });

    // Execute in priority order (high confidence first)
    const strategies = [autocompleteStrategy, nameStrategy];
    const result = await StrategyExecutor.executeStrategies(strategies, context);

    // Should prefer autocomplete mappings due to higher confidence and earlier execution
    const firstNameMapping = result.mappings.find(m => m.profileKey === 'First Name');
    expect(firstNameMapping?.confidence).toBe(0.95); // From autocomplete strategy
    expect(firstNameMapping?.reasoning).toContain('autocomplete');
  });

  it('should handle complex strategy combinations', async () => {
    // Create a comprehensive mapping scenario
    const attributeStrategy = AttributeStrategyFactory.createAutocompleteStrategy({
      'given-name': 'First Name',
      'family-name': 'Last Name',
      'email': 'Email',
      'tel': 'Phone'
    });

    const labelStrategy = new LabelStrategy({
      patterns: [
        { patterns: ['upload', 'resume'], profileKey: 'Resume', confidence: 0.9 }
      ],
      defaultConfidence: 0.8,
      useSynonyms: true
    });

    const customStrategy = new CustomStrategy(
      {
        name: 'comprehensive-analysis',
        baseConfidence: 0.8,
        params: { mode: 'thorough' }
      },
      (formSchema, profileKeys, mappedIndices) => {
        const mappings: FieldMapping[] = [];
        
        // Look for any remaining unmapped fields
        formSchema.fields.forEach((field, index) => {
          if (!mappedIndices.has(index)) {
            // Try to map based on element type
            if (field.elementType === 'input' && field.attributes.type === 'file') {
              if (profileKeys.includes('Resume')) {
                mappings.push({
                  formFieldIdx: index,
                  profileKey: 'Resume',
                  confidence: 0.9,
                  source: 'vendor',
                  action: 'setValue',
                  reasoning: 'File upload heuristic'
                });
              }
            }
          }
        });
        
        return mappings;
      }
    );

    const strategies = [attributeStrategy, labelStrategy, customStrategy];
    const result = await StrategyExecutor.executeStrategies(strategies, context);

    // Should map all fields with appropriate strategies
    expect(result.mappings.length).toBe(5); // All fields should be mapped
    expect(result.mappings.every(m => m.confidence > 0.7)).toBe(true);
    
    // Verify strategy source attribution
    const sourceCounts = result.mappings.reduce((acc, mapping) => {
      const strategy = mapping.reasoning.split(':')[0];
      acc[strategy] = (acc[strategy] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    expect(Object.keys(sourceCounts).length).toBeGreaterThan(1); // Multiple strategies used
  });

  it('should handle strategy factory registration and creation', () => {
    // Clear existing registrations
    StrategyFactory.clear();

    // Register custom strategy types
    StrategyFactory.register('test-attribute', () => 
      AttributeStrategyFactory.createNameStrategy({ 'test': 'Test' })
    );
    
    StrategyFactory.register('test-label', () => 
      LabelStrategyFactory.createContactInfoStrategy()
    );

    StrategyFactory.register('test-custom', () => 
      CustomStrategyFactory.createFileUploadStrategy()
    );

    // Verify registration
    const registeredIds = StrategyFactory.getRegisteredIds();
    expect(registeredIds).toContain('test-attribute');
    expect(registeredIds).toContain('test-label');
    expect(registeredIds).toContain('test-custom');

    // Test strategy creation
    const attributeStrategy = StrategyFactory.create('test-attribute');
    const labelStrategy = StrategyFactory.create('test-label');
    const customStrategy = StrategyFactory.create('test-custom');

    expect(attributeStrategy).toBeInstanceOf(AttributeStrategy);
    expect(labelStrategy).toBeInstanceOf(LabelStrategy);
    expect(customStrategy).toBeInstanceOf(CustomStrategy);

    // Test invalid strategy
    const invalidStrategy = StrategyFactory.create('non-existent');
    expect(invalidStrategy).toBeNull();

    // Cleanup
    StrategyFactory.clear();
  });

  it('should demonstrate parallel vs sequential execution differences', async () => {
    // Create strategies that might compete for the same fields
    const strategy1 = new AttributeStrategy({
      attribute: 'name',
      mappings: { 'firstName': 'First Name' },
      confidence: 0.8,
      matchType: 'exact',
      normalize: true
    });

    const strategy2 = new AttributeStrategy({
      attribute: 'autocomplete',
      mappings: { 'given-name': 'First Name' },
      confidence: 0.9,
      matchType: 'exact',
      normalize: false
    });

    // Sequential execution (waterfall)
    const sequentialResult = await StrategyExecutor.executeStrategies([strategy1, strategy2], context);
    
    // Parallel execution (highest confidence wins)
    const parallelResult = await StrategyExecutor.executeStrategiesParallel([strategy1, strategy2], context);

    // Both should map the first name field, but parallel should prefer higher confidence
    const sequentialMapping = sequentialResult.mappings.find(m => m.profileKey === 'First Name');
    const parallelMapping = parallelResult.mappings.find(m => m.profileKey === 'First Name');

    expect(sequentialMapping?.confidence).toBe(0.8); // First strategy wins
    expect(parallelMapping?.confidence).toBe(0.9);   // Higher confidence wins
  });
});

describe('Real-world Strategy Scenarios', () => {
  it('should handle typical job application form', async () => {
    const jobApplicationSchema: ExtractedFormSchema = {
      url: 'https://company.com/apply',
      fields: [
        {
          idx: 0,
          label: 'Full Name',
          labelSource: 'for-attribute',
          labelConfidence: 0.9,
          selector: 'input[name="applicant_name"]',
          fallbackSelectors: [],
          elementType: 'input',
          attributes: { name: 'applicant_name', type: 'text' },
          options: null
        },
        {
          idx: 1,
          label: 'Email',
          labelSource: 'for-attribute',
          labelConfidence: 0.95,
          selector: 'input[name="email"]',
          fallbackSelectors: [],
          elementType: 'input',
          attributes: { name: 'email', type: 'email', autocomplete: 'email' },
          options: null
        },
        {
          idx: 2,
          label: 'Years of Experience',
          labelSource: 'wrapping-label',
          labelConfidence: 0.8,
          selector: 'select[name="experience"]',
          fallbackSelectors: [],
          elementType: 'select',
          attributes: { name: 'experience' },
          options: [
            { value: '0-2', text: '0-2 years' },
            { value: '3-5', text: '3-5 years' },
            { value: '5+', text: '5+ years' }
          ]
        },
        {
          idx: 3,
          label: 'Resume/CV',
          labelSource: 'for-attribute',
          labelConfidence: 0.9,
          selector: 'input[type="file"]',
          fallbackSelectors: [],
          elementType: 'input',
          attributes: { type: 'file', name: 'resume' },
          options: null
        }
      ] as FormFieldSchema[],
      extractionTime: 150,
      metadata: { vendor: 'generic' }
    };

    const context: StrategyContext = {
      formSchema: jobApplicationSchema,
      profileKeys: ['Full Name', 'Email', 'Experience Level', 'Resume'],
      mappedIndices: new Set(),
      params: {}
    };

    // Use a combination of strategies typical for job applications
    const strategies = [
      AttributeStrategyFactory.createAutocompleteStrategy({
        'email': 'Email'
      }),
      AttributeStrategyFactory.createNameStrategy({
        'applicant_name': 'Full Name',
        'email': 'Email'
      }),
      LabelStrategyFactory.createContactInfoStrategy(),
      CustomStrategyFactory.createFileUploadStrategy('Resume'),
      CustomStrategyFactory.createDropdownAnalysisStrategy({
        'years': 'Experience Level'
      })
    ];

    const result = await StrategyExecutor.executeStrategies(strategies, context);

    // Should successfully map all fields
    expect(result.mappings).toHaveLength(4);
    expect(result.mappings.every(m => m.confidence > 0.6)).toBe(true);
    
    // Verify all profile keys are mapped
    const mappedKeys = new Set(result.mappings.map(m => m.profileKey));
    expect(mappedKeys.has('Full Name')).toBe(true);
    expect(mappedKeys.has('Email')).toBe(true);
    expect(mappedKeys.has('Experience Level')).toBe(true);
    expect(mappedKeys.has('Resume')).toBe(true);
  });
});