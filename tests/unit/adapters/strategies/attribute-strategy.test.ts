/**
 * Tests for Attribute Strategy Implementation
 */

import {
  AttributeStrategy,
  AttributeStrategyFactory
} from '../../../../src/adapters/strategies/attribute-strategy';
import { StrategyContext, StrategyExecutor } from '../../../../src/adapters/strategies/base-strategy';
import { AttributeStrategyConfig } from '../../../../src/adapters/shared/adapter-config';
import { ExtractedFormSchema, FormFieldSchema } from '../../../../src/types';

// Mock form schema with various attribute types
const mockFormSchema: ExtractedFormSchema = {
  url: 'https://test.com',
  fields: [
    {
      idx: 0,
      label: 'First Name',
      labelSource: 'for-attribute',
      labelConfidence: 0.9,
      selector: 'input[name="firstName"]',
      fallbackSelectors: [],
      elementType: 'input',
      attributes: { name: 'firstName', type: 'text', id: 'first-name' },
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
      attributes: { name: 'lastName', type: 'text', id: 'last-name' },
      options: null
    },
    {
      idx: 2,
      label: 'Email',
      labelSource: 'aria-label',
      labelConfidence: 0.95,
      selector: 'input[aria-label="Email Address"]',
      fallbackSelectors: [],
      elementType: 'input',
      attributes: { 'aria-label': 'Email Address', type: 'email', name: 'email' },
      options: null
    },
    {
      idx: 3,
      label: 'Phone',
      labelSource: 'placeholder',
      labelConfidence: 0.7,
      selector: 'input[placeholder="Phone Number"]',
      fallbackSelectors: [],
      elementType: 'input',
      attributes: { placeholder: 'Phone Number', type: 'tel', name: 'phone' },
      options: null
    },
    {
      idx: 4,
      label: 'Country',
      labelSource: 'wrapping-label',
      labelConfidence: 0.8,
      selector: 'select[data-automation-id="country-select"]',
      fallbackSelectors: [],
      elementType: 'select',
      attributes: { 'data-automation-id': 'country-select', name: 'country' },
      options: [
        { value: 'us', text: 'United States' },
        { value: 'ca', text: 'Canada' }
      ]
    }
  ] as FormFieldSchema[],
  extractionTime: 100,
  metadata: {}
};

describe('AttributeStrategy', () => {
  let context: StrategyContext;

  beforeEach(() => {
    context = {
      formSchema: mockFormSchema,
      profileKeys: ['First Name', 'Last Name', 'Email', 'Phone', 'Country'],
      mappedIndices: new Set(),
      params: {}
    };
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      const config: AttributeStrategyConfig = {
        attribute: 'name',
        mappings: { 'firstName': 'First Name' },
        confidence: 0.9,
        matchType: 'exact',
        normalize: true
      };

      const strategy = new AttributeStrategy(config);
      
      expect(strategy.id).toBe('attribute-name');
      expect(strategy.name).toBe('Attribute Mapping (name)');
      expect(strategy.type).toBe('attribute');
    });
  });

  describe('executeStrategy', () => {
    it('should map fields by exact name attribute matches', async () => {
      const config: AttributeStrategyConfig = {
        attribute: 'name',
        mappings: {
          'firstName': 'First Name',
          'lastName': 'Last Name',
          'email': 'Email'
        },
        confidence: 0.9,
        matchType: 'exact',
        normalize: true
      };

      const strategy = new AttributeStrategy(config);
      const result = await strategy.executeStrategy(context);

      expect(result).toHaveLength(3);
      
      const firstNameMapping = result.find(m => m.formFieldIdx === 0);
      expect(firstNameMapping).toBeDefined();
      expect(firstNameMapping?.profileKey).toBe('First Name');
      expect(firstNameMapping?.confidence).toBe(0.9);
      expect(firstNameMapping?.reasoning).toContain('name attribute match: "firstName"');

      const emailMapping = result.find(m => m.formFieldIdx === 2);
      expect(emailMapping).toBeDefined();
      expect(emailMapping?.profileKey).toBe('Email');
    });

    it('should map fields by contains matching', async () => {
      const config: AttributeStrategyConfig = {
        attribute: 'name',
        mappings: {
          'first': 'First Name', // Should match 'firstName'
          'last': 'Last Name',   // Should match 'lastName'
        },
        confidence: 0.8,
        matchType: 'contains',
        normalize: true
      };

      const strategy = new AttributeStrategy(config);
      const result = await strategy.executeStrategy(context);

      expect(result).toHaveLength(2);
      expect(result[0].formFieldIdx).toBe(0); // firstName field
      expect(result[1].formFieldIdx).toBe(1); // lastName field
    });

    it('should map fields by aria-label attributes', async () => {
      const config: AttributeStrategyConfig = {
        attribute: 'aria-label',
        mappings: {
          'Email Address': 'Email'
        },
        confidence: 0.95,
        matchType: 'exact',
        normalize: true
      };

      const strategy = new AttributeStrategy(config);
      const result = await strategy.executeStrategy(context);

      expect(result).toHaveLength(1);
      expect(result[0].formFieldIdx).toBe(2);
      expect(result[0].profileKey).toBe('Email');
      expect(result[0].confidence).toBe(0.95);
    });

    it('should map fields by data-automation-id attributes', async () => {
      const config: AttributeStrategyConfig = {
        attribute: 'data-automation-id',
        mappings: {
          'country-select': 'Country'
        },
        confidence: 0.98,
        matchType: 'exact',
        normalize: false
      };

      const strategy = new AttributeStrategy(config);
      const result = await strategy.executeStrategy(context);

      expect(result).toHaveLength(1);
      expect(result[0].formFieldIdx).toBe(4);
      expect(result[0].profileKey).toBe('Country');
      expect(result[0].action).toBe('selectByText'); // Should be select action for select element
    });

    it('should handle waterfall mapping correctly', async () => {
      const config: AttributeStrategyConfig = {
        attribute: 'name',
        mappings: {
          'firstName': 'First Name',
          'lastName': 'Last Name'
        },
        confidence: 0.9,
        matchType: 'exact',
        normalize: true
      };

      // Mark first field as already mapped
      context.mappedIndices = new Set([0]);

      const strategy = new AttributeStrategy(config);
      const result = await strategy.executeStrategy(context);

      // Should only map the lastName field, skipping firstName
      expect(result).toHaveLength(1);
      expect(result[0].formFieldIdx).toBe(1);
      expect(result[0].profileKey).toBe('Last Name');
    });

    it('should skip unavailable profile keys', async () => {
      const config: AttributeStrategyConfig = {
        attribute: 'name',
        mappings: {
          'firstName': 'First Name',
          'middleName': 'Middle Name', // Not in profileKeys
          'lastName': 'Last Name'
        },
        confidence: 0.9,
        matchType: 'exact',
        normalize: true
      };

      const strategy = new AttributeStrategy(config);
      const result = await strategy.executeStrategy(context);

      // Should skip middleName mapping since 'Middle Name' is not in profileKeys
      expect(result).toHaveLength(2);
      expect(result.every(m => m.profileKey !== 'Middle Name')).toBe(true);
    });

    it('should handle normalization correctly', async () => {
      const configWithNormalization: AttributeStrategyConfig = {
        attribute: 'name',
        mappings: {
          'firstname': 'First Name' // lowercase, should match 'firstName' when normalized
        },
        confidence: 0.9,
        matchType: 'exact',
        normalize: true
      };

      const strategy = new AttributeStrategy(configWithNormalization);
      const result = await strategy.executeStrategy(context);

      expect(result).toHaveLength(1);
      expect(result[0].formFieldIdx).toBe(0);

      // Test without normalization
      const configWithoutNormalization: AttributeStrategyConfig = {
        ...configWithNormalization,
        normalize: false
      };

      const strategyNoNorm = new AttributeStrategy(configWithoutNormalization);
      const resultNoNorm = await strategyNoNorm.executeStrategy(context);

      expect(resultNoNorm).toHaveLength(0); // Should not match due to case difference
    });

    it('should handle multiple matches for the same attribute value', async () => {
      // Add another field with the same name attribute
      const schemaWithDuplicate: ExtractedFormSchema = {
        ...mockFormSchema,
        fields: [
          ...mockFormSchema.fields,
          {
            idx: 5,
            label: 'Another First Name',
            labelSource: 'for-attribute',
            labelConfidence: 0.8,
            selector: 'input[name="firstName"]', // Same name as field 0
            fallbackSelectors: [],
            elementType: 'input',
            attributes: { name: 'firstName', type: 'text' },
            options: null
          } as FormFieldSchema
        ]
      };

      const config: AttributeStrategyConfig = {
        attribute: 'name',
        mappings: {
          'firstName': 'First Name'
        },
        confidence: 0.9,
        matchType: 'exact',
        normalize: true
      };

      const contextWithDuplicate: StrategyContext = {
        ...context,
        formSchema: schemaWithDuplicate
      };

      const strategy = new AttributeStrategy(config);
      const result = await strategy.executeStrategy(contextWithDuplicate);

      // Should map both fields with the same name attribute
      expect(result).toHaveLength(2);
      expect(result[0].formFieldIdx).toBe(0);
      expect(result[1].formFieldIdx).toBe(5);
      expect(result.every(m => m.profileKey === 'First Name')).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate correct configuration', () => {
      const config: AttributeStrategyConfig = {
        attribute: 'name',
        mappings: { 'firstName': 'First Name' },
        confidence: 0.9,
        matchType: 'exact',
        normalize: true
      };

      const strategy = new AttributeStrategy(config);
      const errors = strategy.validate();
      expect(errors).toEqual([]);
    });

    it('should detect missing attribute', () => {
      const config: AttributeStrategyConfig = {
        attribute: '' as any,
        mappings: { 'firstName': 'First Name' },
        confidence: 0.9,
        matchType: 'exact',
        normalize: true
      };

      const strategy = new AttributeStrategy(config);
      const errors = strategy.validate();
      expect(errors).toContain('Attribute name is required');
    });

    it('should detect empty mappings', () => {
      const config: AttributeStrategyConfig = {
        attribute: 'name',
        mappings: {},
        confidence: 0.9,
        matchType: 'exact',
        normalize: true
      };

      const strategy = new AttributeStrategy(config);
      const errors = strategy.validate();
      expect(errors).toContain('At least one attribute mapping must be specified');
    });

    it('should detect invalid confidence', () => {
      const config: AttributeStrategyConfig = {
        attribute: 'name',
        mappings: { 'firstName': 'First Name' },
        confidence: 1.5,
        matchType: 'exact',
        normalize: true
      };

      const strategy = new AttributeStrategy(config);
      const errors = strategy.validate();
      expect(errors).toContain('Confidence must be between 0 and 1');
    });

    it('should detect invalid match type', () => {
      const config: AttributeStrategyConfig = {
        attribute: 'name',
        mappings: { 'firstName': 'First Name' },
        confidence: 0.9,
        matchType: 'invalid' as any,
        normalize: true
      };

      const strategy = new AttributeStrategy(config);
      const errors = strategy.validate();
      expect(errors).toContain('Match type must be "exact" or "contains"');
    });

    it('should detect empty mapping values', () => {
      const config: AttributeStrategyConfig = {
        attribute: 'name',
        mappings: { '': 'First Name', 'lastName': '' },
        confidence: 0.9,
        matchType: 'exact',
        normalize: true
      };

      const strategy = new AttributeStrategy(config);
      const errors = strategy.validate();
      expect(errors).toContain('Attribute values cannot be empty');
      expect(errors).toContain('Profile keys cannot be empty');
    });
  });

  describe('getConfig', () => {
    it('should return comprehensive configuration', () => {
      const config: AttributeStrategyConfig = {
        attribute: 'name',
        mappings: { 'firstName': 'First Name', 'lastName': 'Last Name' },
        confidence: 0.9,
        matchType: 'exact',
        normalize: true
      };

      const strategy = new AttributeStrategy(config);
      const strategyConfig = strategy.getConfig();

      expect(strategyConfig).toEqual({
        id: 'attribute-name',
        name: 'Attribute Mapping (name)',
        type: 'attribute',
        supportsWaterfall: true,
        attribute: 'name',
        mappingCount: 2,
        confidence: 0.9,
        matchType: 'exact',
        normalize: true,
        mappings: { 'firstName': 'First Name', 'lastName': 'Last Name' }
      });
    });
  });
});

describe('AttributeStrategyFactory', () => {
  describe('createNameStrategy', () => {
    it('should create a name attribute strategy with defaults', () => {
      const mappings = { 'firstName': 'First Name', 'lastName': 'Last Name' };
      const strategy = AttributeStrategyFactory.createNameStrategy(mappings);

      expect(strategy.id).toBe('attribute-name');
      expect(strategy.type).toBe('attribute');

      const config = strategy.getConfig();
      expect(config.attribute).toBe('name');
      expect(config.confidence).toBe(0.9);
      expect(config.matchType).toBe('contains');
      expect(config.normalize).toBe(true);
    });

    it('should allow custom confidence', () => {
      const mappings = { 'firstName': 'First Name' };
      const strategy = AttributeStrategyFactory.createNameStrategy(mappings, 0.85);

      const config = strategy.getConfig();
      expect(config.confidence).toBe(0.85);
    });
  });

  describe('createIdStrategy', () => {
    it('should create an id attribute strategy', () => {
      const mappings = { 'first-name': 'First Name' };
      const strategy = AttributeStrategyFactory.createIdStrategy(mappings);

      const config = strategy.getConfig();
      expect(config.attribute).toBe('id');
      expect(config.confidence).toBe(0.85);
    });
  });

  describe('createAriaLabelStrategy', () => {
    it('should create an aria-label strategy with exact matching', () => {
      const mappings = { 'Email Address': 'Email' };
      const strategy = AttributeStrategyFactory.createAriaLabelStrategy(mappings);

      const config = strategy.getConfig();
      expect(config.attribute).toBe('aria-label');
      expect(config.confidence).toBe(0.95);
      expect(config.matchType).toBe('exact');
    });
  });

  describe('createAutomationIdStrategy', () => {
    it('should create a data-automation-id strategy for Workday', () => {
      const mappings = { 'firstName': 'First Name' };
      const strategy = AttributeStrategyFactory.createAutomationIdStrategy(mappings);

      const config = strategy.getConfig();
      expect(config.attribute).toBe('data-automation-id');
      expect(config.confidence).toBe(0.98);
      expect(config.matchType).toBe('contains');
    });
  });

  describe('createPlaceholderStrategy', () => {
    it('should create a placeholder attribute strategy', () => {
      const mappings = { 'Enter your first name': 'First Name' };
      const strategy = AttributeStrategyFactory.createPlaceholderStrategy(mappings);

      const config = strategy.getConfig();
      expect(config.attribute).toBe('placeholder');
      expect(config.confidence).toBe(0.7);
    });
  });

  describe('createAutocompleteStrategy', () => {
    it('should create an autocomplete strategy with exact matching', () => {
      const mappings = { 'given-name': 'First Name', 'family-name': 'Last Name' };
      const strategy = AttributeStrategyFactory.createAutocompleteStrategy(mappings);

      const config = strategy.getConfig();
      expect(config.attribute).toBe('autocomplete');
      expect(config.confidence).toBe(0.9);
      expect(config.matchType).toBe('exact');
      expect(config.normalize).toBe(false); // Autocomplete values are standardized
    });
  });
});

describe('Integration Tests', () => {
  it('should work end-to-end with realistic form scenario', async () => {
    const context: StrategyContext = {
      formSchema: mockFormSchema,
      profileKeys: ['First Name', 'Last Name', 'Email', 'Phone'],
      mappedIndices: new Set(),
      params: {}
    };

    // Create multiple strategies to simulate real adapter usage
    const nameStrategy = AttributeStrategyFactory.createNameStrategy({
      'firstName': 'First Name',
      'lastName': 'Last Name',
      'email': 'Email',
      'phone': 'Phone'
    });

    const ariaLabelStrategy = AttributeStrategyFactory.createAriaLabelStrategy({
      'Email Address': 'Email'
    });

    const placeholderStrategy = AttributeStrategyFactory.createPlaceholderStrategy({
      'Phone Number': 'Phone'
    });

    // Execute strategies with proper waterfall behavior
    const strategies = [nameStrategy, ariaLabelStrategy, placeholderStrategy];
    const result = await StrategyExecutor.executeStrategies(strategies, context);
    const allMappings = result.mappings;

    expect(allMappings).toHaveLength(4); // All fields should be mapped
    expect(allMappings.map(m => m.formFieldIdx).sort()).toEqual([0, 1, 2, 3]);
    expect(allMappings.every(m => m.confidence > 0.6)).toBe(true);
  });

  it('should handle complex attribute scenarios', async () => {
    const complexFormSchema: ExtractedFormSchema = {
      url: 'https://complex-form.com',
      fields: [
        {
          idx: 0,
          label: 'Name',
          labelSource: 'for-attribute',
          labelConfidence: 0.8,
          selector: 'input[name="full-name"]',
          fallbackSelectors: [],
          elementType: 'input',
          attributes: { 
            name: 'full-name', 
            'data-field': 'personal-info',
            autocomplete: 'name',
            placeholder: 'Enter your full name'
          },
          options: null
        }
      ] as FormFieldSchema[],
      extractionTime: 50,
      metadata: {}
    };

    const context: StrategyContext = {
      formSchema: complexFormSchema,
      profileKeys: ['Full Name'],
      mappedIndices: new Set(),
      params: {}
    };

    // Try multiple attribute strategies
    const nameStrategy = new AttributeStrategy({
      attribute: 'name',
      mappings: { 'full-name': 'Full Name' },
      confidence: 0.9,
      matchType: 'exact',
      normalize: true
    });

    const autocompleteStrategy = new AttributeStrategy({
      attribute: 'autocomplete',
      mappings: { 'name': 'Full Name' },
      confidence: 0.95,
      matchType: 'exact',
      normalize: false
    });

    const dataFieldStrategy = new AttributeStrategy({
      attribute: 'data-field',
      mappings: { 'personal': 'Full Name' },
      confidence: 0.7,
      matchType: 'contains',
      normalize: true
    });

    // Execute all strategies
    const nameResult = await nameStrategy.executeStrategy(context);
    const autocompleteResult = await autocompleteStrategy.executeStrategy(context);
    const dataFieldResult = await dataFieldStrategy.executeStrategy(context);

    // All should find the same field but with different confidence levels
    expect(nameResult).toHaveLength(1);
    expect(autocompleteResult).toHaveLength(1);
    expect(dataFieldResult).toHaveLength(1);

    expect(nameResult[0].confidence).toBe(0.9);
    expect(autocompleteResult[0].confidence).toBe(0.95);
    expect(dataFieldResult[0].confidence).toBe(0.7);
  });
});