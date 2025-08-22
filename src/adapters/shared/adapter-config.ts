/**
 * Standardized Adapter Configuration Interface
 * Provides consistent configuration patterns across all vendor adapters
 */

import { ConfidenceLevel, VendorType } from './confidence-constants';
import { FormFieldSchema } from '../../types';

/**
 * Base configuration interface that all adapter configs must implement
 */
export interface AdapterConfig {
  /** Unique identifier for this adapter */
  readonly id: string;
  
  /** Human-readable adapter name */
  readonly name: string;
  
  /** Vendor type for confidence lookups */
  readonly vendorType: VendorType;
  
  /** Domain patterns this adapter handles */
  readonly domains: string[];
  
  /** Custom domain patterns (regex) for enhanced matching */
  readonly domainPatterns?: RegExp[];
  
  /** URL path patterns that indicate this vendor */
  readonly pathPatterns?: string[];
  
  /** Priority for adapter selection (higher = tried first) */
  readonly priority: number;
  
  /** Mapping strategy configurations */
  readonly strategies: StrategyConfig[];
  
  /** Confidence thresholds for this adapter */
  readonly confidence: AdapterConfidenceConfig;
  
  /** Performance and behavior settings */
  readonly performance: AdapterPerformanceConfig;
}

/**
 * Configuration for individual mapping strategies
 */
export interface StrategyConfig {
  /** Strategy identifier */
  readonly id: string;
  
  /** Strategy type */
  readonly type: 'attribute' | 'selector' | 'label' | 'custom';
  
  /** Execution order (lower = earlier) */
  readonly order: number;
  
  /** Whether this strategy is enabled */
  readonly enabled: boolean;
  
  /** Strategy-specific configuration */
  readonly config: AttributeStrategyConfig | SelectorStrategyConfig | LabelStrategyConfig | CustomStrategyConfig;
}

/**
 * Configuration for attribute-based mapping strategies
 */
export interface AttributeStrategyConfig {
  /** HTML attribute to match against */
  readonly attribute: keyof FormFieldSchema['attributes'];
  
  /** Mapping from attribute values to profile keys */
  readonly mappings: Record<string, string>;
  
  /** Confidence level for this strategy */
  readonly confidence: number;
  
  /** Match type: exact or contains */
  readonly matchType: 'exact' | 'contains';
  
  /** Whether to normalize values before matching */
  readonly normalize: boolean;
}

/**
 * Configuration for CSS selector-based strategies
 */
export interface SelectorStrategyConfig {
  /** CSS selector patterns to match */
  readonly selectors: Record<string, string>;
  
  /** Confidence level for selector matches */
  readonly confidence: number;
  
  /** Match type for selector matching */
  readonly matchType: 'exact' | 'contains';
}

/**
 * Configuration for label-based matching strategies
 */
export interface LabelStrategyConfig {
  /** Label patterns to match */
  readonly patterns: Array<{
    readonly patterns: string[];
    readonly profileKey: string;
    readonly confidence?: number;
  }>;
  
  /** Default confidence for label matches */
  readonly defaultConfidence: number;
  
  /** Whether to use synonym matching */
  readonly useSynonyms: boolean;
}

/**
 * Configuration for custom mapping logic
 */
export interface CustomStrategyConfig {
  /** Strategy name for identification */
  readonly name: string;
  
  /** Base confidence for custom mappings */
  readonly baseConfidence: number;
  
  /** Custom configuration parameters */
  readonly params: Record<string, unknown>;
}

/**
 * Confidence configuration for an adapter
 */
export interface AdapterConfidenceConfig {
  /** Minimum confidence to accept mappings */
  readonly minimum: number;
  
  /** Threshold below which mappings are filtered out */
  readonly filterThreshold: number;
  
  /** Confidence boost for high-priority matches */
  readonly boost: number;
  
  /** Confidence penalty for low-quality matches */
  readonly penalty: number;
}

/**
 * Performance and behavior configuration
 */
export interface AdapterPerformanceConfig {
  /** Maximum time to spend on mapping (ms) */
  readonly maxMappingTime: number;
  
  /** Maximum number of fields to process */
  readonly maxFields: number;
  
  /** Whether to enable parallel processing */
  readonly enableParallel: boolean;
  
  /** Whether to enable detailed logging */
  readonly enableDetailedLogging: boolean;
  
  /** Whether to collect performance metrics */
  readonly collectMetrics: boolean;
}

/**
 * Factory for creating standardized adapter configurations
 */
export class AdapterConfigFactory {
  /**
   * Creates a base configuration with sensible defaults
   */
  static createBaseConfig(overrides: Partial<AdapterConfig>): AdapterConfig {
    return {
      id: overrides.id || 'unknown',
      name: overrides.name || 'Unknown Adapter',
      vendorType: overrides.vendorType || 'WORKDAY',
      domains: overrides.domains || [],
      priority: overrides.priority || 0,
      strategies: overrides.strategies || [],
      confidence: {
        minimum: ConfidenceLevel.FILTER_THRESHOLD,
        filterThreshold: ConfidenceLevel.DEVELOPMENT,
        boost: 1.1,
        penalty: 0.9,
        ...overrides.confidence
      },
      performance: {
        maxMappingTime: 5000,
        maxFields: 1000,
        enableParallel: false,
        enableDetailedLogging: false,
        collectMetrics: true,
        ...overrides.performance
      },
      ...overrides
    };
  }
  
  /**
   * Creates an attribute strategy configuration
   */
  static createAttributeStrategy(
    id: string,
    attribute: keyof FormFieldSchema['attributes'],
    mappings: Record<string, string>,
    options: Partial<AttributeStrategyConfig & { order: number }> = {}
  ): StrategyConfig {
    return {
      id,
      type: 'attribute',
      order: options.order || 1,
      enabled: true,
      config: {
        attribute,
        mappings,
        confidence: options.confidence || ConfidenceLevel.HIGH,
        matchType: options.matchType || 'contains',
        normalize: options.normalize !== undefined ? options.normalize : true,
        ...(({ order: _order, ...rest }) => rest)(options)
      }
    };
  }
  
  /**
   * Creates a label strategy configuration
   */
  static createLabelStrategy(
    id: string,
    patterns: LabelStrategyConfig['patterns'],
    options: Partial<LabelStrategyConfig & { order: number }> = {}
  ): StrategyConfig {
    return {
      id,
      type: 'label',
      order: options.order || 3,
      enabled: true,
      config: {
        patterns,
        defaultConfidence: options.defaultConfidence || ConfidenceLevel.STANDARD,
        useSynonyms: options.useSynonyms !== undefined ? options.useSynonyms : true,
        ...(({ order: _order, ...rest }) => rest)(options)
      }
    };
  }
  
  /**
   * Creates a custom strategy configuration
   */
  static createCustomStrategy(
    id: string,
    name: string,
    options: Partial<CustomStrategyConfig & { order: number }> = {}
  ): StrategyConfig {
    return {
      id,
      type: 'custom',
      order: options.order || 2,
      enabled: true,
      config: {
        name,
        baseConfidence: options.baseConfidence || ConfidenceLevel.MEDIUM,
        params: options.params || {},
        ...(({ order: _order, ...rest }) => rest)(options)
      }
    };
  }
}

/**
 * Validation utilities for adapter configurations
 */
export class AdapterConfigValidator {
  /**
   * Validates an adapter configuration
   */
  static validate(config: AdapterConfig): string[] {
    const errors: string[] = [];
    
    if (!config.id || config.id.trim().length === 0) {
      errors.push('Adapter ID is required');
    }
    
    if (!config.name || config.name.trim().length === 0) {
      errors.push('Adapter name is required');
    }
    
    if (!config.domains || config.domains.length === 0) {
      errors.push('At least one domain must be specified');
    }
    
    if (config.priority < 0) {
      errors.push('Priority must be non-negative');
    }
    
    if (config.confidence.minimum < 0 || config.confidence.minimum > 1) {
      errors.push('Minimum confidence must be between 0 and 1');
    }
    
    if (config.confidence.filterThreshold < 0 || config.confidence.filterThreshold > 1) {
      errors.push('Filter threshold must be between 0 and 1');
    }
    
    // Validate strategies
    config.strategies.forEach((strategy, index) => {
      if (!strategy.id || strategy.id.trim().length === 0) {
        errors.push(`Strategy at index ${index} must have an ID`);
      }
      
      if (strategy.order < 0) {
        errors.push(`Strategy ${strategy.id} order must be non-negative`);
      }
    });
    
    return errors;
  }
  
  /**
   * Checks if configuration is valid
   */
  static isValid(config: AdapterConfig): boolean {
    return this.validate(config).length === 0;
  }
}