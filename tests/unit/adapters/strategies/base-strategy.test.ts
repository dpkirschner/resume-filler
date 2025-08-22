/**
 * Tests for Base Strategy Implementation
 */

import {
  BaseStrategy,
  StrategyFactory,
  StrategyExecutor,
  type MappingStrategy,
  type StrategyContext,
  type StrategyResult
} from '../../../../src/adapters/strategies/base-strategy';
import { FieldMapping, ExtractedFormSchema, FormFieldSchema } from '../../../../src/types';

// Mock concrete strategy for testing
class MockStrategy extends BaseStrategy {
  constructor(
    id: string,
    name: string,
    private mockMappings: FieldMapping[] = [],
    private shouldThrow = false
  ) {
    super(id, name, 'custom');
  }

  protected async executeStrategy(context: StrategyContext): Promise<FieldMapping[]> {
    if (this.shouldThrow) {
      throw new Error('Mock strategy error');
    }
    return this.mockMappings;
  }
}

// Mock form schema for testing
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
      label: 'Email',
      labelSource: 'aria-label',
      labelConfidence: 0.95,
      selector: 'input[aria-label="Email"]',
      fallbackSelectors: [],
      elementType: 'input',
      attributes: { 'aria-label': 'Email', type: 'email' },
      options: null
    },
    {
      idx: 2,
      label: 'Country',
      labelSource: 'wrapping-label',
      labelConfidence: 0.8,
      selector: 'select[name="country"]',
      fallbackSelectors: [],
      elementType: 'select',
      attributes: { name: 'country' },
      options: [
        { value: 'us', text: 'United States' },
        { value: 'ca', text: 'Canada' }
      ]
    }
  ] as FormFieldSchema[],
  extractionTime: 100,
  metadata: {}
};

describe('BaseStrategy', () => {
  let strategy: MockStrategy;
  let context: StrategyContext;

  beforeEach(() => {
    strategy = new MockStrategy('test-strategy', 'Test Strategy');
    context = {
      formSchema: mockFormSchema,
      profileKeys: ['First Name', 'Email', 'Country'],
      mappedIndices: new Set(),
      params: {}
    };
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(strategy.id).toBe('test-strategy');
      expect(strategy.name).toBe('Test Strategy');
      expect(strategy.type).toBe('custom');
      expect(strategy.supportsWaterfall).toBe(true);
    });
  });

  describe('execute', () => {
    it('should execute strategy and return result with metadata', async () => {
      const mockMappings: FieldMapping[] = [
        {
          formFieldIdx: 0,
          profileKey: 'First Name',
          confidence: 0.9,
          source: 'vendor',
          action: 'setValue',
          reasoning: 'Test mapping'
        }
      ];

      strategy = new MockStrategy('test', 'Test', mockMappings);
      const result = await strategy.execute(context);

      expect(result.mappings).toEqual(mockMappings);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.metadata).toEqual({
        strategyId: 'test',
        strategyType: 'custom',
        fieldsProcessed: 3,
        mappingsFound: 1
      });
    });

    it('should handle strategy errors gracefully', async () => {
      strategy = new MockStrategy('test', 'Test', [], true);
      const result = await strategy.execute(context);

      expect(result.mappings).toEqual([]);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.metadata?.error).toBe('Mock strategy error');
    });

    it('should validate mappings', async () => {
      const invalidMappings: FieldMapping[] = [
        {
          formFieldIdx: -1, // Invalid: negative index
          profileKey: '',   // Invalid: empty profile key
          confidence: 1.5,  // Invalid: > 1
          source: 'vendor',
          action: 'setValue',
          reasoning: 'Invalid mapping'
        },
        {
          formFieldIdx: 0,
          profileKey: 'Valid Key',
          confidence: 0.8,
          source: 'vendor',
          action: 'setValue',
          reasoning: 'Valid mapping'
        }
      ];

      strategy = new MockStrategy('test', 'Test', invalidMappings);
      const result = await strategy.execute(context);

      // Should filter out invalid mappings
      expect(result.mappings).toHaveLength(1);
      expect(result.mappings[0].profileKey).toBe('Valid Key');
    });
  });

  describe('validate', () => {
    it('should validate correct strategy configuration', () => {
      const errors = strategy.validate();
      expect(errors).toEqual([]);
    });

    it('should detect missing ID', () => {
      strategy = new MockStrategy('', 'Test Strategy');
      const errors = strategy.validate();
      expect(errors).toContain('Strategy ID is required');
    });

    it('should detect missing name', () => {
      strategy = new MockStrategy('test', '');
      const errors = strategy.validate();
      expect(errors).toContain('Strategy name is required');
    });
  });

  describe('getConfig', () => {
    it('should return strategy configuration', () => {
      const config = strategy.getConfig();
      expect(config).toEqual({
        id: 'test-strategy',
        name: 'Test Strategy',
        type: 'custom',
        supportsWaterfall: true
      });
    });
  });

  describe('createFieldMapping', () => {
    it('should create field mapping with correct action for input', () => {
      const field = mockFormSchema.fields[0]; // input field
      const mapping = (strategy as any).createFieldMapping(
        0,
        'First Name',
        0.9,
        'Test mapping',
        field
      );

      expect(mapping).toEqual({
        formFieldIdx: 0,
        profileKey: 'First Name',
        confidence: 0.9,
        source: 'vendor',
        action: 'setValue',
        reasoning: 'Test Strategy: Test mapping'
      });
    });

    it('should create field mapping with correct action for select', () => {
      const field = mockFormSchema.fields[2]; // select field
      const mapping = (strategy as any).createFieldMapping(
        2,
        'Country',
        0.8,
        'Test select mapping',
        field
      );

      expect(mapping.action).toBe('selectByText');
    });

    it('should clamp confidence values', () => {
      const field = mockFormSchema.fields[0];
      
      // Test clamping high values
      let mapping = (strategy as any).createFieldMapping(0, 'Test', 1.5, 'Test', field);
      expect(mapping.confidence).toBe(1.0);
      
      // Test clamping low values
      mapping = (strategy as any).createFieldMapping(0, 'Test', -0.5, 'Test', field);
      expect(mapping.confidence).toBe(0.0);
    });
  });

  describe('helper methods', () => {
    it('should check if field is mapped correctly', () => {
      const mappedIndices = new Set([0, 2]);
      
      expect((strategy as any).isFieldMapped(0, mappedIndices)).toBe(true);
      expect((strategy as any).isFieldMapped(1, mappedIndices)).toBe(false);
      expect((strategy as any).isFieldMapped(2, mappedIndices)).toBe(true);
    });

    it('should normalize text correctly', () => {
      expect((strategy as any).normalizeText('  First   Name  ')).toBe('first name');
      expect((strategy as any).normalizeText('Email\t\nAddress')).toBe('email address');
      expect((strategy as any).normalizeText('')).toBe('');
    });

    it('should check profile key availability', () => {
      const profileKeys = ['First Name', 'Email', 'Phone'];
      
      expect((strategy as any).isProfileKeyAvailable('First Name', profileKeys)).toBe(true);
      expect((strategy as any).isProfileKeyAvailable('Address', profileKeys)).toBe(false);
      expect((strategy as any).isProfileKeyAvailable('', profileKeys)).toBe(false);
    });
  });
});

describe('StrategyFactory', () => {
  beforeEach(() => {
    StrategyFactory.clear();
  });

  afterEach(() => {
    StrategyFactory.clear();
  });

  it('should register and create strategies', () => {
    const mockConstructor = () => new MockStrategy('factory-test', 'Factory Test');
    StrategyFactory.register('test-strategy', mockConstructor);

    const strategy = StrategyFactory.create('test-strategy');
    expect(strategy).toBeInstanceOf(MockStrategy);
    expect(strategy?.id).toBe('factory-test');
  });

  it('should return null for unregistered strategies', () => {
    const strategy = StrategyFactory.create('unknown-strategy');
    expect(strategy).toBeNull();
  });

  it('should track registered strategy IDs', () => {
    StrategyFactory.register('strategy1', () => new MockStrategy('1', 'One'));
    StrategyFactory.register('strategy2', () => new MockStrategy('2', 'Two'));

    const ids = StrategyFactory.getRegisteredIds();
    expect(ids).toContain('strategy1');
    expect(ids).toContain('strategy2');
    expect(ids).toHaveLength(2);
  });

  it('should clear all registered strategies', () => {
    StrategyFactory.register('test', () => new MockStrategy('test', 'Test'));
    expect(StrategyFactory.getRegisteredIds()).toHaveLength(1);

    StrategyFactory.clear();
    expect(StrategyFactory.getRegisteredIds()).toHaveLength(0);
  });
});

describe('StrategyExecutor', () => {
  let context: StrategyContext;

  beforeEach(() => {
    context = {
      formSchema: mockFormSchema,
      profileKeys: ['First Name', 'Email', 'Country'],
      mappedIndices: new Set(),
      params: {}
    };
  });

  describe('executeStrategies', () => {
    it('should execute strategies in sequence with waterfall', async () => {
      const mapping1: FieldMapping = {
        formFieldIdx: 0,
        profileKey: 'First Name',
        confidence: 0.9,
        source: 'vendor',
        action: 'setValue',
        reasoning: 'Strategy 1'
      };

      const mapping2: FieldMapping = {
        formFieldIdx: 0, // Same field as mapping1 - should be ignored due to waterfall
        profileKey: 'Different Name',
        confidence: 0.8,
        source: 'vendor',
        action: 'setValue',
        reasoning: 'Strategy 2'
      };

      const mapping3: FieldMapping = {
        formFieldIdx: 1, // Different field - should be included
        profileKey: 'Email',
        confidence: 0.7,
        source: 'vendor',
        action: 'setValue',
        reasoning: 'Strategy 2'
      };

      const strategy1 = new MockStrategy('s1', 'Strategy 1', [mapping1]);
      const strategy2 = new MockStrategy('s2', 'Strategy 2', [mapping2, mapping3]);

      const result = await StrategyExecutor.executeStrategies([strategy1, strategy2], context);

      expect(result.mappings).toHaveLength(2);
      expect(result.mappings[0]).toEqual(mapping1);
      expect(result.mappings[1]).toEqual(mapping3);
      expect(result.results).toHaveLength(2);
      expect(result.totalTime).toBeGreaterThan(0);
    });

    it('should handle empty strategy list', async () => {
      const result = await StrategyExecutor.executeStrategies([], context);

      expect(result.mappings).toEqual([]);
      expect(result.results).toEqual([]);
      expect(result.totalTime).toBeGreaterThan(0);
    });

    it('should handle strategy errors gracefully', async () => {
      const goodMapping: FieldMapping = {
        formFieldIdx: 0,
        profileKey: 'First Name',
        confidence: 0.9,
        source: 'vendor',
        action: 'setValue',
        reasoning: 'Good strategy'
      };

      const goodStrategy = new MockStrategy('good', 'Good Strategy', [goodMapping]);
      const badStrategy = new MockStrategy('bad', 'Bad Strategy', [], true);

      const result = await StrategyExecutor.executeStrategies([goodStrategy, badStrategy], context);

      expect(result.mappings).toHaveLength(1);
      expect(result.mappings[0]).toEqual(goodMapping);
      expect(result.results).toHaveLength(2);
      expect(result.results[1].mappings).toEqual([]); // Bad strategy should return empty
    });
  });

  describe('executeStrategiesParallel', () => {
    it('should execute strategies in parallel', async () => {
      const mapping1: FieldMapping = {
        formFieldIdx: 0,
        profileKey: 'First Name',
        confidence: 0.9,
        source: 'vendor',
        action: 'setValue',
        reasoning: 'Strategy 1'
      };

      const mapping2: FieldMapping = {
        formFieldIdx: 1,
        profileKey: 'Email',
        confidence: 0.8,
        source: 'vendor',
        action: 'setValue',
        reasoning: 'Strategy 2'
      };

      const strategy1 = new MockStrategy('s1', 'Strategy 1', [mapping1]);
      const strategy2 = new MockStrategy('s2', 'Strategy 2', [mapping2]);

      const result = await StrategyExecutor.executeStrategiesParallel([strategy1, strategy2], context);

      expect(result.mappings).toHaveLength(2);
      expect(result.results).toHaveLength(2);
      expect(result.totalTime).toBeGreaterThan(0);
    });

    it('should deduplicate mappings by highest confidence', async () => {
      const lowConfidenceMapping: FieldMapping = {
        formFieldIdx: 0,
        profileKey: 'First Name',
        confidence: 0.7,
        source: 'vendor',
        action: 'setValue',
        reasoning: 'Low confidence'
      };

      const highConfidenceMapping: FieldMapping = {
        formFieldIdx: 0, // Same field
        profileKey: 'Different Name',
        confidence: 0.9, // Higher confidence
        source: 'vendor',
        action: 'setValue',
        reasoning: 'High confidence'
      };

      const strategy1 = new MockStrategy('s1', 'Strategy 1', [lowConfidenceMapping]);
      const strategy2 = new MockStrategy('s2', 'Strategy 2', [highConfidenceMapping]);

      const result = await StrategyExecutor.executeStrategiesParallel([strategy1, strategy2], context);

      expect(result.mappings).toHaveLength(1);
      expect(result.mappings[0]).toEqual(highConfidenceMapping);
    });

    it('should handle parallel execution errors', async () => {
      const goodMapping: FieldMapping = {
        formFieldIdx: 0,
        profileKey: 'First Name',
        confidence: 0.9,
        source: 'vendor',
        action: 'setValue',
        reasoning: 'Good strategy'
      };

      const goodStrategy = new MockStrategy('good', 'Good Strategy', [goodMapping]);
      const badStrategy = new MockStrategy('bad', 'Bad Strategy', [], true);

      const result = await StrategyExecutor.executeStrategiesParallel([goodStrategy, badStrategy], context);

      expect(result.mappings).toHaveLength(1);
      expect(result.mappings[0]).toEqual(goodMapping);
    });
  });
});

describe('Integration Tests', () => {
  it('should work end-to-end with realistic strategy scenarios', async () => {
    const context: StrategyContext = {
      formSchema: mockFormSchema,
      profileKeys: ['First Name', 'Email', 'Country'],
      mappedIndices: new Set(),
      params: {}
    };

    // High-confidence strategy for exact matches
    const exactMappings: FieldMapping[] = [
      {
        formFieldIdx: 0,
        profileKey: 'First Name',
        confidence: 0.95,
        source: 'vendor',
        action: 'setValue',
        reasoning: 'Exact attribute match'
      }
    ];

    // Medium-confidence strategy for remaining fields
    const heuristicMappings: FieldMapping[] = [
      {
        formFieldIdx: 0, // Should be ignored due to waterfall
        profileKey: 'First Name',
        confidence: 0.7,
        source: 'heuristic',
        action: 'setValue',
        reasoning: 'Heuristic match'
      },
      {
        formFieldIdx: 1,
        profileKey: 'Email',
        confidence: 0.8,
        source: 'heuristic',
        action: 'setValue',
        reasoning: 'Label match'
      }
    ];

    const exactStrategy = new MockStrategy('exact', 'Exact Strategy', exactMappings);
    const heuristicStrategy = new MockStrategy('heuristic', 'Heuristic Strategy', heuristicMappings);

    const result = await StrategyExecutor.executeStrategies(
      [exactStrategy, heuristicStrategy],
      context
    );

    // Should have high-confidence mapping for field 0 and heuristic mapping for field 1
    expect(result.mappings).toHaveLength(2);
    expect(result.mappings[0].confidence).toBe(0.95); // Exact match kept
    expect(result.mappings[1].formFieldIdx).toBe(1); // Heuristic match for different field
    expect(result.mappings[1].confidence).toBe(0.8);

    // Verify waterfall behavior
    const field0Mappings = result.mappings.filter(m => m.formFieldIdx === 0);
    expect(field0Mappings).toHaveLength(1);
    expect(field0Mappings[0].reasoning).toContain('Exact attribute match');
  });

  it('should handle complex strategy factory scenarios', () => {
    StrategyFactory.clear();

    // Register multiple strategy types
    StrategyFactory.register('high-accuracy', () => 
      new MockStrategy('high', 'High Accuracy', [], false)
    );
    StrategyFactory.register('fallback', () => 
      new MockStrategy('fallback', 'Fallback Strategy', [], false)
    );

    // Verify factory state
    const ids = StrategyFactory.getRegisteredIds();
    expect(ids).toHaveLength(2);

    // Create and verify strategies
    const highAccuracy = StrategyFactory.create('high-accuracy');
    const fallback = StrategyFactory.create('fallback');

    expect(highAccuracy?.id).toBe('high');
    expect(fallback?.id).toBe('fallback');

    // Cleanup
    StrategyFactory.clear();
    expect(StrategyFactory.getRegisteredIds()).toHaveLength(0);
  });
});