/**
 * Tests for Custom Strategy Implementation
 */

import {
  CustomStrategy,
  CustomStrategyFactory,
  type CustomMappingFunction
} from '../../../../src/adapters/strategies/custom-strategy';
import { StrategyContext } from '../../../../src/adapters/strategies/base-strategy';
import { CustomStrategyConfig } from '../../../../src/adapters/shared/adapter-config';
import { ExtractedFormSchema, FormFieldSchema, FieldMapping } from '../../../../src/types';

// Mock form schema with diverse field types for custom strategy testing
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
      attributes: { name: 'firstName', type: 'text' },
      options: null
    },
    {
      idx: 1,
      label: 'Upload Resume',
      labelSource: 'for-attribute',
      labelConfidence: 0.9,
      selector: 'input[type="file"]',
      fallbackSelectors: [],
      elementType: 'input',
      attributes: { type: 'file', accept: '.pdf,.doc,.docx' },
      options: null
    },
    {
      idx: 2,
      label: 'Experience Level',
      labelSource: 'wrapping-label',
      labelConfidence: 0.8,
      selector: 'select[name="experience"]',
      fallbackSelectors: [],
      elementType: 'select',
      attributes: { name: 'experience' },
      options: [
        { value: 'entry', text: 'Entry Level (0-2 years)' },
        { value: 'mid', text: 'Mid Level (3-5 years)' },
        { value: 'senior', text: 'Senior Level (5+ years)' }
      ]
    },
    {
      idx: 3,
      label: 'Cover Letter',
      labelSource: 'for-attribute',
      labelConfidence: 0.9,
      selector: 'textarea[name="coverLetter"]',
      fallbackSelectors: [],
      elementType: 'textarea',
      attributes: { name: 'coverLetter', rows: '10' },
      options: null
    },
    {
      idx: 4,
      label: 'Preferred Location',
      labelSource: 'wrapping-label',
      labelConfidence: 0.8,
      selector: 'select.location-dropdown[name="location"]',
      fallbackSelectors: [],
      elementType: 'select',
      attributes: { name: 'location', class: 'location-dropdown' },
      options: [
        { value: 'ny', text: 'New York, NY' },
        { value: 'sf', text: 'San Francisco, CA' },
        { value: 'remote', text: 'Remote' }
      ]
    },
    {
      idx: 5,
      label: 'Skills',
      labelSource: 'for-attribute',
      labelConfidence: 0.8,
      selector: 'input.skill-input[name="skills"]',
      fallbackSelectors: [],
      elementType: 'input',
      attributes: { name: 'skills', type: 'text', class: 'skill-input' },
      options: null
    },
    {
      idx: 6,
      label: 'Additional Document',
      labelSource: 'for-attribute',
      labelConfidence: 0.8,
      selector: 'input[type="file"][name="portfolio"]',
      fallbackSelectors: [],
      elementType: 'input',
      attributes: { type: 'file', name: 'portfolio', accept: '.pdf,.jpg,.png' },
      options: null
    }
  ] as FormFieldSchema[],
  extractionTime: 200,
  metadata: {}
};

describe('CustomStrategy', () => {
  let context: StrategyContext;
  let mockMappingFunction: CustomMappingFunction;

  beforeEach(() => {
    context = {
      formSchema: mockFormSchema,
      profileKeys: ['First Name', 'Resume', 'Experience Level', 'Cover Letter', 'Location', 'Skills', 'Portfolio'],
      mappedIndices: new Set(),
      params: { testParam: 'testValue' }
    };

    mockMappingFunction = jest.fn((formSchema, profileKeys, mappedIndices, params) => {
      return [
        {
          formFieldIdx: 0,
          profileKey: 'First Name',
          confidence: 0.9,
          source: 'vendor' as const,
          action: 'setValue' as const,
          reasoning: 'Custom logic matched first name'
        }
      ];
    });
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      const config: CustomStrategyConfig = {
        name: 'test-custom',
        baseConfidence: 0.85,
        params: { key: 'value' }
      };

      const strategy = new CustomStrategy(config, mockMappingFunction);
      
      expect(strategy.id).toBe('custom-test-custom');
      expect(strategy.name).toBe('Custom Strategy: test-custom');
      expect(strategy.type).toBe('custom');
    });
  });

  describe('executeStrategy', () => {
    it('should execute custom mapping function with correct parameters', async () => {
      const config: CustomStrategyConfig = {
        name: 'test-custom',
        baseConfidence: 0.85,
        params: { customParam: 'value' }
      };

      const strategy = new CustomStrategy(config, mockMappingFunction);
      await strategy.execute(context);

      expect(mockMappingFunction).toHaveBeenCalledWith(
        context.formSchema,
        context.profileKeys,
        context.mappedIndices,
        config.params
      );
    });

    it('should apply base confidence to mappings without explicit confidence', async () => {
      const mappingWithoutConfidence: FieldMapping = {
        formFieldIdx: 1,
        profileKey: 'Resume',
        confidence: 0, // Should be overridden
        source: 'vendor',
        action: 'setValue',
        reasoning: 'File upload detected'
      };

      const customFunction: CustomMappingFunction = () => [mappingWithoutConfidence];
      const config: CustomStrategyConfig = {
        name: 'file-upload',
        baseConfidence: 0.9,
        params: {}
      };

      const strategy = new CustomStrategy(config, customFunction);
      const result = await strategy.execute(context);

      expect(result.mappings).toHaveLength(1);
      expect(result.mappings[0].confidence).toBe(0.9); // Should use base confidence
    });

    it('should preserve explicit confidence values', async () => {
      const mappingWithConfidence: FieldMapping = {
        formFieldIdx: 1,
        profileKey: 'Resume',
        confidence: 0.95, // Should be preserved
        source: 'vendor',
        action: 'setValue',
        reasoning: 'High confidence file upload'
      };

      const customFunction: CustomMappingFunction = () => [mappingWithConfidence];
      const config: CustomStrategyConfig = {
        name: 'file-upload',
        baseConfidence: 0.8,
        params: {}
      };

      const strategy = new CustomStrategy(config, customFunction);
      const result = await strategy.execute(context);

      expect(result.mappings[0].confidence).toBe(0.95); // Should preserve original
    });

    it('should enhance reasoning with strategy name', async () => {
      const mappingWithReasoning: FieldMapping = {
        formFieldIdx: 1,
        profileKey: 'Resume',
        confidence: 0.9,
        source: 'vendor',
        action: 'setValue',
        reasoning: 'File upload detected'
      };

      const mappingWithoutReasoning: FieldMapping = {
        formFieldIdx: 2,
        profileKey: 'Experience Level',
        confidence: 0.8,
        source: 'vendor',
        action: 'selectByText',
        reasoning: ''
      };

      const customFunction: CustomMappingFunction = () => [mappingWithReasoning, mappingWithoutReasoning];
      const config: CustomStrategyConfig = {
        name: 'test-strategy',
        baseConfidence: 0.8,
        params: {}
      };

      const strategy = new CustomStrategy(config, customFunction);
      const result = await strategy.execute(context);

      expect(result.mappings).toHaveLength(2);
      expect(result.mappings[0].reasoning).toBe('Custom Strategy: test-strategy: File upload detected');
      expect(result.mappings[1].reasoning).toBe('Custom Strategy: test-strategy: Custom mapping logic');
    });

    it('should handle mapping function errors gracefully', async () => {
      const errorFunction: CustomMappingFunction = () => {
        throw new Error('Custom function error');
      };

      const config: CustomStrategyConfig = {
        name: 'error-strategy',
        baseConfidence: 0.8,
        params: {}
      };

      const strategy = new CustomStrategy(config, errorFunction);
      const result = await strategy.execute(context);

      expect(result.mappings).toEqual([]);
      expect(result.processingTime).toBeGreaterThan(0);
      // Custom strategy catches errors internally and returns empty array
      // The base strategy will have metadata about the execution
      expect(result.metadata?.strategyId).toBe('custom-error-strategy');
      expect(result.metadata?.mappingsFound).toBe(0);
    });

    it('should pass correct context to mapping function', async () => {
      const testFunction: CustomMappingFunction = (formSchema, profileKeys, mappedIndices, params) => {
        expect(formSchema).toBe(context.formSchema);
        expect(profileKeys).toBe(context.profileKeys);
        expect(mappedIndices).toBe(context.mappedIndices);
        expect(params).toEqual({ testParam: 'testValue' });
        return [];
      };

      const config: CustomStrategyConfig = {
        name: 'test-strategy',
        baseConfidence: 0.8,
        params: { testParam: 'testValue' }
      };

      const strategy = new CustomStrategy(config, testFunction);
      await strategy.execute(context);
    });
  });

  describe('validate', () => {
    it('should validate correct configuration', () => {
      const config: CustomStrategyConfig = {
        name: 'test-strategy',
        baseConfidence: 0.8,
        params: {}
      };

      const strategy = new CustomStrategy(config, mockMappingFunction);
      const errors = strategy.validate();
      expect(errors).toEqual([]);
    });

    it('should detect missing strategy name', () => {
      const config: CustomStrategyConfig = {
        name: '',
        baseConfidence: 0.8,
        params: {}
      };

      const strategy = new CustomStrategy(config, mockMappingFunction);
      const errors = strategy.validate();
      expect(errors).toContain('Custom strategy name is required');
    });

    it('should detect invalid confidence', () => {
      const config: CustomStrategyConfig = {
        name: 'test-strategy',
        baseConfidence: 1.5,
        params: {}
      };

      const strategy = new CustomStrategy(config, mockMappingFunction);
      const errors = strategy.validate();
      expect(errors).toContain('Base confidence must be between 0 and 1');
    });

    it('should detect missing mapping function', () => {
      const config: CustomStrategyConfig = {
        name: 'test-strategy',
        baseConfidence: 0.8,
        params: {}
      };

      const strategy = new CustomStrategy(config, null as any);
      const errors = strategy.validate();
      expect(errors).toContain('Mapping function must be provided');
    });
  });

  describe('getConfig', () => {
    it('should return comprehensive configuration', () => {
      const config: CustomStrategyConfig = {
        name: 'test-strategy',
        baseConfidence: 0.85,
        params: { key1: 'value1', key2: 42 }
      };

      const strategy = new CustomStrategy(config, mockMappingFunction);
      const strategyConfig = strategy.getConfig();

      expect(strategyConfig).toEqual({
        id: 'custom-test-strategy',
        name: 'Custom Strategy: test-strategy',
        type: 'custom',
        supportsWaterfall: true,
        customName: 'test-strategy',
        baseConfidence: 0.85,
        params: { key1: 'value1', key2: 42 },
        hasMappingFunction: true
      });
    });
  });
});

describe('CustomStrategyFactory', () => {
  let context: StrategyContext;

  beforeEach(() => {
    context = {
      formSchema: mockFormSchema,
      profileKeys: ['Resume', 'Portfolio', 'Experience Level', 'Cover Letter', 'Location', 'Skills'],
      mappedIndices: new Set(),
      params: {}
    };
  });

  describe('createFileUploadStrategy', () => {
    it('should create file upload strategy with defaults', () => {
      const strategy = CustomStrategyFactory.createFileUploadStrategy();

      expect(strategy.id).toBe('custom-file-upload-detection');
      expect(strategy.name).toBe('Custom Strategy: file-upload-detection');

      const config = strategy.getConfig();
      expect(config.baseConfidence).toBe(0.9);
      expect(config.params).toEqual({ resumeProfileKey: 'Resume' });
    });

    it('should allow custom resume profile key and confidence', () => {
      const strategy = CustomStrategyFactory.createFileUploadStrategy('CV', 0.95);
      
      const config = strategy.getConfig();
      expect(config.baseConfidence).toBe(0.95);
      expect(config.params).toEqual({ resumeProfileKey: 'CV' });
    });

    it('should detect file upload fields correctly', async () => {
      const strategy = CustomStrategyFactory.createFileUploadStrategy();
      const result = await strategy.execute(context);

      // Should find both file upload fields (Resume and Portfolio)
      expect(result.mappings).toHaveLength(2);
      
      const resumeMapping = result.mappings.find(m => m.formFieldIdx === 1);
      const portfolioMapping = result.mappings.find(m => m.formFieldIdx === 6);

      expect(resumeMapping).toBeDefined();
      expect(resumeMapping?.profileKey).toBe('Resume');
      expect(resumeMapping?.reasoning).toContain('File input detected as resume upload');

      expect(portfolioMapping).toBeDefined();
      expect(portfolioMapping?.profileKey).toBe('Resume');
    });

    it('should skip when profile key is not available', async () => {
      const contextWithoutResume: StrategyContext = {
        ...context,
        profileKeys: ['First Name', 'Email'] // No Resume profile key
      };

      const strategy = CustomStrategyFactory.createFileUploadStrategy();
      const result = await strategy.execute(contextWithoutResume);

      expect(result.mappings).toHaveLength(0);
    });

    it('should handle waterfall mapping correctly', async () => {
      const contextWithMapped: StrategyContext = {
        ...context,
        mappedIndices: new Set([1]) // First file upload already mapped
      };

      const strategy = CustomStrategyFactory.createFileUploadStrategy();
      const result = await strategy.execute(contextWithMapped);

      // Should only map the second file upload
      expect(result.mappings).toHaveLength(1);
      expect(result.mappings[0].formFieldIdx).toBe(6);
    });
  });

  describe('createDropdownAnalysisStrategy', () => {
    it('should create dropdown analysis strategy', () => {
      const optionMappings = {
        'years': 'Experience Level',
        'location': 'Location'
      };

      const strategy = CustomStrategyFactory.createDropdownAnalysisStrategy(optionMappings);

      const config = strategy.getConfig();
      expect(config.customName).toBe('dropdown-analysis');
      expect(config.baseConfidence).toBe(0.85);
      expect(config.params).toEqual({ optionMappings });
    });

    it('should analyze dropdown options correctly', async () => {
      const optionMappings = {
        'years': 'Experience Level',
        'remote': 'Location'
      };

      const strategy = CustomStrategyFactory.createDropdownAnalysisStrategy(optionMappings);
      const result = await strategy.execute(context);

      // Should find both dropdowns based on their options
      expect(result.mappings).toHaveLength(2);

      const experienceMapping = result.mappings.find(m => m.formFieldIdx === 2);
      const locationMapping = result.mappings.find(m => m.formFieldIdx === 4);

      expect(experienceMapping).toBeDefined();
      expect(experienceMapping?.profileKey).toBe('Experience Level');
      expect(experienceMapping?.action).toBe('selectByText');

      expect(locationMapping).toBeDefined();
      expect(locationMapping?.profileKey).toBe('Location');
    });

    it('should skip non-select fields', async () => {
      const optionMappings = { 'text': 'First Name' };
      const strategy = CustomStrategyFactory.createDropdownAnalysisStrategy(optionMappings);
      const result = await strategy.execute(context);

      // Should not match any input fields, only selects
      expect(result.mappings).toHaveLength(0);
    });
  });

  describe('createCssClassStrategy', () => {
    it('should create CSS class strategy', () => {
      const classPatterns = {
        'location-dropdown': 'Location',
        'skill-input': 'Skills'
      };

      const strategy = CustomStrategyFactory.createCssClassStrategy(classPatterns);

      const config = strategy.getConfig();
      expect(config.customName).toBe('css-class-patterns');
      expect(config.baseConfidence).toBe(0.8);
      expect(config.params).toEqual({ classPatterns });
    });

    it('should match fields by CSS class patterns', async () => {
      const classPatterns = {
        'location-dropdown': 'Location',
        'skill-input': 'Skills'
      };

      const strategy = CustomStrategyFactory.createCssClassStrategy(classPatterns);
      const result = await strategy.execute(context);

      expect(result.mappings).toHaveLength(2);

      const locationMapping = result.mappings.find(m => m.formFieldIdx === 4);
      const skillsMapping = result.mappings.find(m => m.formFieldIdx === 5);

      expect(locationMapping).toBeDefined();
      expect(locationMapping?.profileKey).toBe('Location');
      expect(locationMapping?.action).toBe('selectByText');

      expect(skillsMapping).toBeDefined();
      expect(skillsMapping?.profileKey).toBe('Skills');
      expect(skillsMapping?.action).toBe('setValue');
    });

    it('should handle case-insensitive matching', async () => {
      const classPatterns = {
        'LOCATION-DROPDOWN': 'Location' // Uppercase pattern
      };

      const strategy = CustomStrategyFactory.createCssClassStrategy(classPatterns);
      const result = await strategy.execute(context);

      expect(result.mappings).toHaveLength(1);
      expect(result.mappings[0].profileKey).toBe('Location');
    });
  });

  describe('createTextareaStrategy', () => {
    it('should create textarea strategy with defaults', () => {
      const strategy = CustomStrategyFactory.createTextareaStrategy();

      const config = strategy.getConfig();
      expect(config.customName).toBe('textarea-analysis');
      expect(config.baseConfidence).toBe(0.85);
      expect(config.params).toEqual({ textareaProfileKey: 'Cover Letter' });
    });

    it('should detect textarea fields correctly', async () => {
      const strategy = CustomStrategyFactory.createTextareaStrategy();
      const result = await strategy.execute(context);

      expect(result.mappings).toHaveLength(1);
      expect(result.mappings[0].formFieldIdx).toBe(3);
      expect(result.mappings[0].profileKey).toBe('Cover Letter');
      expect(result.mappings[0].action).toBe('setValue');
    });

    it('should require specific cover letter indicators', async () => {
      // Create a textarea without cover letter indicators
      const schemaWithGenericTextarea: ExtractedFormSchema = {
        ...mockFormSchema,
        fields: [
          {
            idx: 0,
            label: 'Comments',
            labelSource: 'for-attribute',
            labelConfidence: 0.8,
            selector: 'textarea[name="comments"]',
            fallbackSelectors: [],
            elementType: 'textarea',
            attributes: { name: 'comments' },
            options: null
          } as FormFieldSchema
        ]
      };

      const genericContext: StrategyContext = {
        ...context,
        formSchema: schemaWithGenericTextarea
      };

      const strategy = CustomStrategyFactory.createTextareaStrategy();
      const result = await strategy.execute(genericContext);

      // Should not match generic textarea without cover letter indicators
      expect(result.mappings).toHaveLength(0);
    });

    it('should allow custom textarea profile key', () => {
      const strategy = CustomStrategyFactory.createTextareaStrategy('Personal Statement', 0.9);

      const config = strategy.getConfig();
      expect(config.baseConfidence).toBe(0.9);
      expect(config.params).toEqual({ textareaProfileKey: 'Personal Statement' });
    });
  });
});

describe('Integration Tests', () => {
  let context: StrategyContext;

  beforeEach(() => {
    context = {
      formSchema: mockFormSchema,
      profileKeys: ['Resume', 'Experience Level', 'Cover Letter', 'Location', 'Skills'],
      mappedIndices: new Set(),
      params: {}
    };
  });

  it('should work end-to-end with multiple custom strategies', async () => {
    const fileUploadStrategy = CustomStrategyFactory.createFileUploadStrategy();
    const dropdownStrategy = CustomStrategyFactory.createDropdownAnalysisStrategy({
      'years': 'Experience Level',
      'remote': 'Location'
    });
    const textareaStrategy = CustomStrategyFactory.createTextareaStrategy();
    const cssStrategy = CustomStrategyFactory.createCssClassStrategy({
      'skill-input': 'Skills'
    });

    const strategies = [fileUploadStrategy, dropdownStrategy, textareaStrategy, cssStrategy];
    
    // Execute all strategies to test combined behavior
    const allResults = await Promise.all(
      strategies.map(strategy => strategy.execute(context))
    );

    expect(allResults).toHaveLength(4);
    allResults.forEach(result => {
      expect(result.mappings.length).toBeGreaterThanOrEqual(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    const totalMappings = allResults.reduce((total, result) => total + result.mappings.length, 0);
    expect(totalMappings).toBeGreaterThan(4);
  });

  it('should handle complex custom mapping scenarios', async () => {
    // Create a complex custom strategy that combines multiple approaches
    const complexMappingFunction: CustomMappingFunction = (
      formSchema,
      profileKeys,
      mappedIndices,
      params
    ) => {
      const mappings: FieldMapping[] = [];

      formSchema.fields.forEach((field, index) => {
        if (mappedIndices.has(index)) return;

        // File upload detection
        if (field.attributes.type === 'file' && profileKeys.includes('Resume')) {
          mappings.push({
            formFieldIdx: index,
            profileKey: 'Resume',
            confidence: 0.95,
            source: 'vendor',
            action: 'setValue',
            reasoning: 'Complex file detection'
          });
        }

        // Textarea with size heuristics
        if (field.elementType === 'textarea' && profileKeys.includes('Cover Letter')) {
          const rows = parseInt(field.attributes.rows as string || '1');
          if (rows > 5) { // Large textareas are likely cover letters
            mappings.push({
              formFieldIdx: index,
              profileKey: 'Cover Letter',
              confidence: 0.9,
              source: 'vendor',
              action: 'setValue',
              reasoning: 'Large textarea detected'
            });
          }
        }

        // Smart dropdown analysis
        if (field.elementType === 'select' && field.options) {
          const optionText = field.options.map(o => o.text.toLowerCase()).join(' ');
          
          if (optionText.includes('year') && profileKeys.includes('Experience Level')) {
            mappings.push({
              formFieldIdx: index,
              profileKey: 'Experience Level',
              confidence: 0.88,
              source: 'vendor',
              action: 'selectByText',
              reasoning: 'Smart dropdown analysis'
            });
          }
        }
      });

      return mappings;
    };

    const config: CustomStrategyConfig = {
      name: 'complex-analysis',
      baseConfidence: 0.8,
      params: { analysisLevel: 'advanced' }
    };

    const strategy = new CustomStrategy(config, complexMappingFunction);
    const result = await strategy.execute(context);

    expect(result.mappings.length).toBeGreaterThan(2);
    expect(result.mappings.every(m => m.reasoning.includes('complex-analysis'))).toBe(true);
    expect(result.processingTime).toBeGreaterThan(0);
  });

  it('should demonstrate custom strategy flexibility', async () => {
    // Create a strategy that uses parameters for dynamic behavior
    const parameterizedFunction: CustomMappingFunction = (
      formSchema,
      profileKeys,
      mappedIndices,
      params
    ) => {
      const mappings: FieldMapping[] = [];
      const confidenceMultiplier = (params.boostConfidence as number) || 1;
      const targetElements = (params.targetElements as string[]) || ['input', 'select'];

      formSchema.fields.forEach((field, index) => {
        if (mappedIndices.has(index)) return;
        
        if (targetElements.includes(field.elementType)) {
          // Simple name-based matching with parameter-controlled confidence
          const fieldName = field.attributes.name as string;
          if (fieldName === 'skills' && profileKeys.includes('Skills')) {
            mappings.push({
              formFieldIdx: index,
              profileKey: 'Skills',
              confidence: Math.min(0.85 * confidenceMultiplier, 1.0),
              source: 'vendor',
              action: 'setValue',
              reasoning: 'Parameterized matching'
            });
          }
        }
      });

      return mappings;
    };

    const config: CustomStrategyConfig = {
      name: 'parameterized-strategy',
      baseConfidence: 0.75,
      params: {
        boostConfidence: 1.2,
        targetElements: ['input', 'textarea', 'select']
      }
    };

    const strategy = new CustomStrategy(config, parameterizedFunction);
    const result = await strategy.execute(context);

    expect(result.mappings).toHaveLength(1);
    // The confidence should be clamped to 1.0 since 0.85 * 1.2 = 1.02 > 1.0
    expect(result.mappings[0].confidence).toBe(1.0);
    expect(result.mappings[0].profileKey).toBe('Skills');
  });
});