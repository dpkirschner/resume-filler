/**
 * Tests for Adapter Configuration Utilities
 */

import {
  AdapterConfigFactory,
  AdapterConfigValidator,
  type AdapterConfig,
  type StrategyConfig,
  type AttributeStrategyConfig,
  type LabelStrategyConfig,
  type CustomStrategyConfig
} from '../../../../src/adapters/shared/adapter-config';
import { ConfidenceLevel } from '../../../../src/adapters/shared/confidence-constants';

describe('AdapterConfigFactory', () => {
  describe('createBaseConfig', () => {
    it('should create a valid base configuration with defaults', () => {
      const config = AdapterConfigFactory.createBaseConfig({
        id: 'test-adapter',
        name: 'Test Adapter',
        vendorType: 'WORKDAY',
        domains: ['test.com']
      });

      expect(config.id).toBe('test-adapter');
      expect(config.name).toBe('Test Adapter');
      expect(config.vendorType).toBe('WORKDAY');
      expect(config.domains).toEqual(['test.com']);
      expect(config.priority).toBe(0);
      expect(config.strategies).toEqual([]);
      
      // Check confidence defaults
      expect(config.confidence.minimum).toBe(ConfidenceLevel.FILTER_THRESHOLD);
      expect(config.confidence.filterThreshold).toBe(ConfidenceLevel.DEVELOPMENT);
      expect(config.confidence.boost).toBe(1.1);
      expect(config.confidence.penalty).toBe(0.9);
      
      // Check performance defaults
      expect(config.performance.maxMappingTime).toBe(5000);
      expect(config.performance.maxFields).toBe(1000);
      expect(config.performance.enableParallel).toBe(false);
      expect(config.performance.enableDetailedLogging).toBe(false);
      expect(config.performance.collectMetrics).toBe(true);
    });

    it('should allow overriding specific properties', () => {
      const config = AdapterConfigFactory.createBaseConfig({
        id: 'custom-adapter',
        name: 'Custom Adapter',
        vendorType: 'GREENHOUSE',
        domains: ['custom.com'],
        priority: 100,
        confidence: {
          minimum: 0.7,
          filterThreshold: 0.5,
          boost: 1.2,
          penalty: 0.8
        },
        performance: {
          maxMappingTime: 3000,
          maxFields: 500,
          enableParallel: true,
          enableDetailedLogging: true,
          collectMetrics: false
        }
      });

      expect(config.priority).toBe(100);
      expect(config.confidence.minimum).toBe(0.7);
      expect(config.confidence.filterThreshold).toBe(0.5);
      expect(config.performance.maxMappingTime).toBe(3000);
      expect(config.performance.enableParallel).toBe(true);
    });

    it('should handle missing required fields with defaults', () => {
      const config = AdapterConfigFactory.createBaseConfig({});
      
      expect(config.id).toBe('unknown');
      expect(config.name).toBe('Unknown Adapter');
      expect(config.vendorType).toBe('WORKDAY');
      expect(config.domains).toEqual([]);
    });
  });

  describe('createAttributeStrategy', () => {
    it('should create a valid attribute strategy configuration', () => {
      const mappings = { 'name': 'First Name', 'email': 'Email' };
      const strategy = AdapterConfigFactory.createAttributeStrategy(
        'test-name-strategy',
        'name',
        mappings
      );

      expect(strategy.id).toBe('test-name-strategy');
      expect(strategy.type).toBe('attribute');
      expect(strategy.order).toBe(1);
      expect(strategy.enabled).toBe(true);
      
      const config = strategy.config as AttributeStrategyConfig;
      expect(config.attribute).toBe('name');
      expect(config.mappings).toEqual(mappings);
      expect(config.confidence).toBe(ConfidenceLevel.HIGH);
      expect(config.matchType).toBe('contains');
      expect(config.normalize).toBe(true);
    });

    it('should allow overriding default options', () => {
      const mappings = { 'aria-label': 'Email' };
      const strategy = AdapterConfigFactory.createAttributeStrategy(
        'aria-strategy',
        'aria-label',
        mappings,
        {
          confidence: 0.95,
          matchType: 'exact',
          normalize: false,
          order: 5
        }
      );

      expect(strategy.order).toBe(5);
      
      const config = strategy.config as AttributeStrategyConfig;
      expect(config.confidence).toBe(0.95);
      expect(config.matchType).toBe('exact');
      expect(config.normalize).toBe(false);
    });
  });

  describe('createLabelStrategy', () => {
    it('should create a valid label strategy configuration', () => {
      const patterns = [
        { patterns: ['first name', 'given name'], profileKey: 'First Name' },
        { patterns: ['email', 'email address'], profileKey: 'Email' }
      ];
      
      const strategy = AdapterConfigFactory.createLabelStrategy(
        'test-label-strategy',
        patterns
      );

      expect(strategy.id).toBe('test-label-strategy');
      expect(strategy.type).toBe('label');
      expect(strategy.order).toBe(3);
      expect(strategy.enabled).toBe(true);
      
      const config = strategy.config as LabelStrategyConfig;
      expect(config.patterns).toEqual(patterns);
      expect(config.defaultConfidence).toBe(ConfidenceLevel.STANDARD);
      expect(config.useSynonyms).toBe(true);
    });

    it('should allow overriding default options', () => {
      const patterns = [
        { patterns: ['name'], profileKey: 'Name' }
      ];
      
      const strategy = AdapterConfigFactory.createLabelStrategy(
        'custom-label',
        patterns,
        {
          defaultConfidence: 0.7,
          useSynonyms: false,
          order: 10
        }
      );

      expect(strategy.order).toBe(10);
      
      const config = strategy.config as LabelStrategyConfig;
      expect(config.defaultConfidence).toBe(0.7);
      expect(config.useSynonyms).toBe(false);
    });
  });

  describe('createCustomStrategy', () => {
    it('should create a valid custom strategy configuration', () => {
      const strategy = AdapterConfigFactory.createCustomStrategy(
        'test-custom',
        'File Upload Detection'
      );

      expect(strategy.id).toBe('test-custom');
      expect(strategy.type).toBe('custom');
      expect(strategy.order).toBe(2);
      expect(strategy.enabled).toBe(true);
      
      const config = strategy.config as CustomStrategyConfig;
      expect(config.name).toBe('File Upload Detection');
      expect(config.baseConfidence).toBe(ConfidenceLevel.MEDIUM);
      expect(config.params).toEqual({});
    });

    it('should allow overriding default options', () => {
      const customParams = { fileTypes: ['pdf', 'doc'], maxSize: '10MB' };
      const strategy = AdapterConfigFactory.createCustomStrategy(
        'file-upload',
        'Advanced File Detection',
        {
          baseConfidence: 0.95,
          params: customParams,
          order: 1
        }
      );

      expect(strategy.order).toBe(1);
      
      const config = strategy.config as CustomStrategyConfig;
      expect(config.baseConfidence).toBe(0.95);
      expect(config.params).toEqual(customParams);
    });
  });
});

describe('AdapterConfigValidator', () => {
  describe('validate', () => {
    it('should validate a correct configuration', () => {
      const validConfig: AdapterConfig = {
        id: 'test-adapter',
        name: 'Test Adapter',
        vendorType: 'WORKDAY',
        domains: ['test.com'],
        priority: 100,
        strategies: [],
        confidence: {
          minimum: 0.5,
          filterThreshold: 0.3,
          boost: 1.1,
          penalty: 0.9
        },
        performance: {
          maxMappingTime: 5000,
          maxFields: 1000,
          enableParallel: false,
          enableDetailedLogging: false,
          collectMetrics: true
        }
      };

      const errors = AdapterConfigValidator.validate(validConfig);
      expect(errors).toEqual([]);
    });

    it('should detect missing required fields', () => {
      const invalidConfig = {
        id: '',
        name: '',
        vendorType: 'WORKDAY',
        domains: [],
        priority: 0,
        strategies: [],
        confidence: {
          minimum: 0.5,
          filterThreshold: 0.3,
          boost: 1.1,
          penalty: 0.9
        },
        performance: {
          maxMappingTime: 5000,
          maxFields: 1000,
          enableParallel: false,
          enableDetailedLogging: false,
          collectMetrics: true
        }
      } as AdapterConfig;

      const errors = AdapterConfigValidator.validate(invalidConfig);
      expect(errors).toContain('Adapter ID is required');
      expect(errors).toContain('Adapter name is required');
      expect(errors).toContain('At least one domain must be specified');
    });

    it('should detect invalid confidence values', () => {
      const invalidConfig: AdapterConfig = {
        id: 'test',
        name: 'Test',
        vendorType: 'WORKDAY',
        domains: ['test.com'],
        priority: 0,
        strategies: [],
        confidence: {
          minimum: 1.5, // Invalid: > 1
          filterThreshold: -0.1, // Invalid: < 0
          boost: 1.1,
          penalty: 0.9
        },
        performance: {
          maxMappingTime: 5000,
          maxFields: 1000,
          enableParallel: false,
          enableDetailedLogging: false,
          collectMetrics: true
        }
      };

      const errors = AdapterConfigValidator.validate(invalidConfig);
      expect(errors).toContain('Minimum confidence must be between 0 and 1');
      expect(errors).toContain('Filter threshold must be between 0 and 1');
    });

    it('should detect negative priority', () => {
      const invalidConfig: AdapterConfig = {
        id: 'test',
        name: 'Test',
        vendorType: 'WORKDAY',
        domains: ['test.com'],
        priority: -1, // Invalid: negative
        strategies: [],
        confidence: {
          minimum: 0.5,
          filterThreshold: 0.3,
          boost: 1.1,
          penalty: 0.9
        },
        performance: {
          maxMappingTime: 5000,
          maxFields: 1000,
          enableParallel: false,
          enableDetailedLogging: false,
          collectMetrics: true
        }
      };

      const errors = AdapterConfigValidator.validate(invalidConfig);
      expect(errors).toContain('Priority must be non-negative');
    });

    it('should validate strategy configurations', () => {
      const invalidStrategy: StrategyConfig = {
        id: '', // Invalid: empty
        type: 'attribute',
        order: -1, // Invalid: negative
        enabled: true,
        config: {
          attribute: 'name',
          mappings: {},
          confidence: 0.8,
          matchType: 'exact',
          normalize: true
        } as AttributeStrategyConfig
      };

      const configWithInvalidStrategy: AdapterConfig = {
        id: 'test',
        name: 'Test',
        vendorType: 'WORKDAY',
        domains: ['test.com'],
        priority: 0,
        strategies: [invalidStrategy],
        confidence: {
          minimum: 0.5,
          filterThreshold: 0.3,
          boost: 1.1,
          penalty: 0.9
        },
        performance: {
          maxMappingTime: 5000,
          maxFields: 1000,
          enableParallel: false,
          enableDetailedLogging: false,
          collectMetrics: true
        }
      };

      const errors = AdapterConfigValidator.validate(configWithInvalidStrategy);
      expect(errors).toContain('Strategy at index 0 must have an ID');
      expect(errors).toContain('Strategy  order must be non-negative');
    });
  });

  describe('isValid', () => {
    it('should return true for valid configurations', () => {
      const validConfig = AdapterConfigFactory.createBaseConfig({
        id: 'test',
        name: 'Test',
        vendorType: 'WORKDAY',
        domains: ['test.com']
      });

      expect(AdapterConfigValidator.isValid(validConfig)).toBe(true);
    });

    it('should return false for invalid configurations', () => {
      const invalidConfig = AdapterConfigFactory.createBaseConfig({
        id: '', // Invalid
        name: 'Test',
        vendorType: 'WORKDAY',
        domains: ['test.com']
      });

      expect(AdapterConfigValidator.isValid(invalidConfig)).toBe(false);
    });
  });
});

describe('Integration Tests', () => {
  it('should create and validate a complete adapter configuration', () => {
    // Create strategies
    const nameStrategy = AdapterConfigFactory.createAttributeStrategy(
      'name-attr',
      'name',
      { 'firstName': 'First Name', 'lastName': 'Last Name' }
    );

    const labelStrategy = AdapterConfigFactory.createLabelStrategy(
      'contact-labels',
      [
        { patterns: ['email', 'email address'], profileKey: 'Email' },
        { patterns: ['phone', 'telephone'], profileKey: 'Phone' }
      ]
    );

    const customStrategy = AdapterConfigFactory.createCustomStrategy(
      'file-upload',
      'File Upload Detection',
      { params: { acceptedTypes: ['pdf', 'doc'] } }
    );

    // Create complete adapter configuration
    const adapterConfig = AdapterConfigFactory.createBaseConfig({
      id: 'workday-adapter',
      name: 'Workday ATS Adapter',
      vendorType: 'WORKDAY',
      domains: ['workday.com', 'myworkday.com'],
      priority: 100,
      strategies: [nameStrategy, labelStrategy, customStrategy],
      confidence: {
        minimum: 0.4,
        filterThreshold: 0.3,
        boost: 1.1,
        penalty: 0.9
      },
      performance: {
        maxMappingTime: 5000,
        maxFields: 1000,
        enableParallel: false,
        enableDetailedLogging: true,
        collectMetrics: true
      }
    });

    // Validate the complete configuration
    const errors = AdapterConfigValidator.validate(adapterConfig);
    expect(errors).toEqual([]);
    expect(AdapterConfigValidator.isValid(adapterConfig)).toBe(true);

    // Verify strategies are ordered correctly
    const strategyOrders = adapterConfig.strategies.map(s => s.order);
    expect(strategyOrders).toEqual([1, 3, 2]); // name=1, label=3, custom=2
  });

  it('should handle complex strategy configurations', () => {
    const complexAttributeStrategy = AdapterConfigFactory.createAttributeStrategy(
      'complex-aria',
      'aria-label',
      {
        'First Name': 'First Name',
        'Last Name': 'Last Name',
        'Email Address': 'Email',
        'Phone Number': 'Phone'
      },
      {
        confidence: 0.95,
        matchType: 'exact',
        normalize: true,
        order: 1
      }
    );

    const complexLabelStrategy = AdapterConfigFactory.createLabelStrategy(
      'comprehensive-labels',
      [
        { patterns: ['given name', 'first name', 'fname'], profileKey: 'First Name', confidence: 0.9 },
        { patterns: ['family name', 'last name', 'lname', 'surname'], profileKey: 'Last Name', confidence: 0.9 },
        { patterns: ['email', 'e-mail', 'email address'], profileKey: 'Email', confidence: 0.85 },
        { patterns: ['phone', 'telephone', 'mobile', 'cell'], profileKey: 'Phone', confidence: 0.8 }
      ],
      {
        defaultConfidence: 0.7,
        useSynonyms: true,
        order: 2
      }
    );

    const config = AdapterConfigFactory.createBaseConfig({
      id: 'comprehensive-adapter',
      name: 'Comprehensive Test Adapter',
      vendorType: 'GREENHOUSE',
      domains: ['test.greenhouse.io'],
      strategies: [complexAttributeStrategy, complexLabelStrategy]
    });

    const errors = AdapterConfigValidator.validate(config);
    expect(errors).toEqual([]);

    // Verify strategy configurations
    const attrConfig = config.strategies[0].config as AttributeStrategyConfig;
    expect(attrConfig.confidence).toBe(0.95);
    expect(attrConfig.matchType).toBe('exact');

    const labelConfig = config.strategies[1].config as LabelStrategyConfig;
    expect(labelConfig.patterns).toHaveLength(4);
    expect(labelConfig.patterns[0].confidence).toBe(0.9);
  });

  it('should maintain configuration structure', () => {
    const config = AdapterConfigFactory.createBaseConfig({
      id: 'structure-test',
      name: 'Structure Test',
      vendorType: 'WORKDAY',
      domains: ['test.com']
    });

    // Verify config structure and properties
    expect(config.id).toBe('structure-test');
    expect(config.domains).toEqual(['test.com']);
    expect(config.name).toBe('Structure Test');
    expect(config.vendorType).toBe('WORKDAY');
  });
});