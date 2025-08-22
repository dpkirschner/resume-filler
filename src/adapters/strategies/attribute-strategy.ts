/**
 * Attribute-Based Mapping Strategy
 * Maps form fields based on HTML attributes (name, id, data-automation-id, aria-label, etc.)
 */

import { BaseStrategy, StrategyContext } from './base-strategy';
import { FieldMapping, FormFieldSchema } from '../../types';
import { AttributeStrategyConfig } from '../shared/adapter-config';

/**
 * Strategy for mapping fields based on HTML attributes
 */
export class AttributeStrategy extends BaseStrategy {
  constructor(private config: AttributeStrategyConfig) {
    super(
      `attribute-${config.attribute}`,
      `Attribute Mapping (${config.attribute})`,
      'attribute'
    );
  }
  
  protected async executeStrategy(context: StrategyContext): Promise<FieldMapping[]> {
    const mappings: FieldMapping[] = [];
    const { formSchema, profileKeys, mappedIndices } = context;
    
    // Build optimized lookup map for O(1) performance
    const attributeLookup = this.buildAttributeLookupMap(formSchema);
    
    // Process each mapping configuration
    for (const [attributeValue, profileKey] of Object.entries(this.config.mappings)) {
      // Skip if profile key is not available
      if (!this.isProfileKeyAvailable(profileKey, profileKeys)) {
        continue;
      }
      
      const normalizedAttributeValue = this.config.normalize ? this.normalizeText(attributeValue) : attributeValue;
      
      // Find fields that match this attribute value
      const matchingIndices = this.findMatchingFields(normalizedAttributeValue, attributeLookup);
      
      for (const fieldIndex of matchingIndices) {
        // Skip if field already mapped (waterfall support)
        if (this.isFieldMapped(fieldIndex, mappedIndices)) {
          continue;
        }
        
        const field = formSchema.fields[fieldIndex];
        mappings.push(this.createFieldMapping(
          fieldIndex,
          profileKey,
          this.config.confidence,
          `${this.config.attribute} attribute match: "${attributeValue}"`,
          field
        ));
      }
    }
    
    return mappings;
  }
  
  /**
   * Finds field indices that match the given attribute value
   */
  private findMatchingFields(searchValue: string, attributeLookup: Map<string, number[]>): number[] {
    const matches: number[] = [];
    
    if (this.config.matchType === 'exact') {
      // Exact match - look for the exact key
      const exactMatch = attributeLookup.get(searchValue);
      if (exactMatch) {
        matches.push(...exactMatch);
      }
    } else {
      // Contains match - find all attribute values that contain the search value
      for (const [attributeValue, fieldIndices] of attributeLookup.entries()) {
        if (attributeValue.includes(searchValue)) {
          matches.push(...fieldIndices);
        }
      }
    }
    
    return [...new Set(matches)]; // Remove duplicates
  }
  
  /**
   * Builds optimized lookup map for attribute values to field indices
   */
  private buildAttributeLookupMap(formSchema: import('../../types').ExtractedFormSchema): Map<string, number[]> {
    const lookup = new Map<string, number[]>();
    
    formSchema.fields.forEach((field: FormFieldSchema, index: number) => {
      const attributeValue = field.attributes[this.config.attribute];
      
      if (attributeValue && typeof attributeValue === 'string') {
        const normalizedValue = this.config.normalize 
          ? this.normalizeText(attributeValue) 
          : attributeValue;
        
        // Handle different match types
        if (this.config.matchType === 'exact') {
          this.addToLookup(lookup, normalizedValue, index);
        } else {
          // For 'contains' mode, index both full value and meaningful parts
          this.addToLookup(lookup, normalizedValue, index);
          
          // Also index word parts for better matching flexibility
          const words = normalizedValue.split(/[-_\s]+/);
          words.forEach(word => {
            if (word.length > 2) { // Only index meaningful parts
              this.addToLookup(lookup, word, index);
            }
          });
        }
      }
    });
    
    return lookup;
  }
  
  /**
   * Helper to add field index to lookup map
   */
  private addToLookup(lookup: Map<string, number[]>, key: string, index: number): void {
    const existing = lookup.get(key);
    if (existing) {
      existing.push(index);
    } else {
      lookup.set(key, [index]);
    }
  }
  
  /**
   * Validates the attribute strategy configuration
   */
  validate(): string[] {
    const errors = super.validate();
    
    if (!this.config.attribute) {
      errors.push('Attribute name is required');
    }
    
    if (!this.config.mappings || Object.keys(this.config.mappings).length === 0) {
      errors.push('At least one attribute mapping must be specified');
    }
    
    if (this.config.confidence < 0 || this.config.confidence > 1) {
      errors.push('Confidence must be between 0 and 1');
    }
    
    if (!['exact', 'contains'].includes(this.config.matchType)) {
      errors.push('Match type must be "exact" or "contains"');
    }
    
    // Validate mappings
    Object.entries(this.config.mappings).forEach(([attrValue, profileKey]) => {
      if (!attrValue || attrValue.trim().length === 0) {
        errors.push('Attribute values cannot be empty');
      }
      
      if (!profileKey || profileKey.trim().length === 0) {
        errors.push('Profile keys cannot be empty');
      }
    });
    
    return errors;
  }
  
  /**
   * Gets strategy configuration for debugging
   */
  getConfig(): Record<string, unknown> {
    return {
      ...super.getConfig(),
      attribute: this.config.attribute,
      mappingCount: Object.keys(this.config.mappings).length,
      confidence: this.config.confidence,
      matchType: this.config.matchType,
      normalize: this.config.normalize,
      mappings: this.config.mappings
    };
  }
}

/**
 * Factory for creating common attribute strategies
 */
export class AttributeStrategyFactory {
  /**
   * Creates a strategy for name attribute mapping
   */
  static createNameStrategy(mappings: Record<string, string>, confidence = 0.9): AttributeStrategy {
    return new AttributeStrategy({
      attribute: 'name',
      mappings,
      confidence,
      matchType: 'contains',
      normalize: true
    });
  }
  
  /**
   * Creates a strategy for id attribute mapping
   */
  static createIdStrategy(mappings: Record<string, string>, confidence = 0.85): AttributeStrategy {
    return new AttributeStrategy({
      attribute: 'id',
      mappings,
      confidence,
      matchType: 'contains',
      normalize: true
    });
  }
  
  /**
   * Creates a strategy for aria-label attribute mapping
   */
  static createAriaLabelStrategy(mappings: Record<string, string>, confidence = 0.95): AttributeStrategy {
    return new AttributeStrategy({
      attribute: 'aria-label',
      mappings,
      confidence,
      matchType: 'exact',
      normalize: true
    });
  }
  
  /**
   * Creates a strategy for data-automation-id attribute mapping (Workday)
   */
  static createAutomationIdStrategy(mappings: Record<string, string>, confidence = 0.98): AttributeStrategy {
    return new AttributeStrategy({
      attribute: 'data-automation-id',
      mappings,
      confidence,
      matchType: 'contains',
      normalize: true
    });
  }
  
  /**
   * Creates a strategy for placeholder attribute mapping
   */
  static createPlaceholderStrategy(mappings: Record<string, string>, confidence = 0.7): AttributeStrategy {
    return new AttributeStrategy({
      attribute: 'placeholder',
      mappings,
      confidence,
      matchType: 'contains',
      normalize: true
    });
  }
  
  /**
   * Creates a strategy for autocomplete attribute mapping
   */
  static createAutocompleteStrategy(mappings: Record<string, string>, confidence = 0.9): AttributeStrategy {
    return new AttributeStrategy({
      attribute: 'autocomplete',
      mappings,
      confidence,
      matchType: 'exact',
      normalize: false // autocomplete values are standardized
    });
  }
}