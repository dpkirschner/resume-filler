/**
 * Mapping Strategies Index
 * Exports all available mapping strategies and related utilities
 */

// Base strategy interfaces and utilities
export type {
  MappingStrategy,
  StrategyContext,
  StrategyResult
} from './base-strategy';
export {
  BaseStrategy,
  StrategyFactory,
  StrategyExecutor
} from './base-strategy';

// Attribute-based strategies
export {
  AttributeStrategy,
  AttributeStrategyFactory
} from './attribute-strategy';

// Label-based strategies
export {
  LabelStrategy,
  LabelStrategyFactory
} from './label-strategy';

// Custom strategies
export {
  CustomStrategy,
  CustomStrategyFactory
} from './custom-strategy';

export type { CustomMappingFunction } from './custom-strategy';

// Re-export strategy configuration types
export type {
  StrategyConfig,
  AttributeStrategyConfig,
  LabelStrategyConfig,
  CustomStrategyConfig
} from '../shared/adapter-config';

/**
 * Registry of all available strategy types
 */
export const STRATEGY_TYPES = {
  ATTRIBUTE: 'attribute',
  LABEL: 'label',
  CUSTOM: 'custom',
  SELECTOR: 'selector' // Reserved for future selector-based strategies
} as const;

/**
 * Utility for strategy configuration validation
 */
export class StrategyBuilder {
  /**
   * Validates a strategy configuration
   */
  static validateConfig(config: unknown): string[] {
    const errors: string[] = [];
    
    if (!config || typeof config !== 'object') {
      errors.push('Config must be an object');
      return errors;
    }
    
    const configObj = config as Record<string, unknown>;
    
    if (!configObj.type) {
      errors.push('Strategy type is required');
    }
    
    if (!configObj.id) {
      errors.push('Strategy ID is required');
    }
    
    if (typeof configObj.order !== 'number' || configObj.order < 0) {
      errors.push('Strategy order must be a non-negative number');
    }
    
    if (!configObj.config) {
      errors.push('Strategy configuration is required');
    }
    
    return errors;
  }
}

/**
 * Common strategy configurations for reuse across adapters
 */
export const COMMON_STRATEGIES = {
  /**
   * Standard name attribute strategy
   */
  NAME_ATTRIBUTE: {
    id: 'name-attribute',
    type: 'attribute',
    order: 1,
    enabled: true,
    config: {
      attribute: 'name',
      mappings: {
        'first_name': 'First Name',
        'fname': 'First Name',
        'last_name': 'Last Name',
        'lname': 'Last Name',
        'email': 'Email',
        'phone': 'Phone',
        'address': 'Address',
        'city': 'City',
        'state': 'State',
        'zip': 'Zip Code',
        'country': 'Country'
      },
      confidence: 0.9,
      matchType: 'contains',
      normalize: true
    }
  },
  
  /**
   * Standard autocomplete attribute strategy
   */
  AUTOCOMPLETE_ATTRIBUTE: {
    id: 'autocomplete-attribute',
    type: 'attribute',
    order: 1,
    enabled: true,
    config: {
      attribute: 'autocomplete',
      mappings: {
        'given-name': 'First Name',
        'family-name': 'Last Name',
        'email': 'Email',
        'tel': 'Phone',
        'street-address': 'Address',
        'address-line1': 'Address',
        'address-line2': 'Address Line 2',
        'locality': 'City',
        'region': 'State',
        'postal-code': 'Zip Code',
        'country': 'Country'
      },
      confidence: 0.95,
      matchType: 'exact',
      normalize: false
    }
  },
  
  /**
   * Standard contact information labels
   */
  CONTACT_LABELS: {
    id: 'contact-labels',
    type: 'label',
    order: 3,
    enabled: true,
    config: {
      patterns: [
        { patterns: ['first name', 'given name'], profileKey: 'First Name' },
        { patterns: ['last name', 'family name', 'surname'], profileKey: 'Last Name' },
        { patterns: ['email', 'email address'], profileKey: 'Email' },
        { patterns: ['phone', 'telephone', 'mobile'], profileKey: 'Phone' }
      ],
      defaultConfidence: 0.8,
      useSynonyms: true
    }
  }
} as const;