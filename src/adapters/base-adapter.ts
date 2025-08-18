/**
 * Base Adapter Class
 * Provides common functionality for vendor-specific ATS adapters
 */

import { 
  VendorAdapter, 
  ExtractedFormSchema, 
  MappingResult, 
  FieldMapping,
  FormFieldSchema 
} from '../types';
import { findCanonicalProfileKey } from '../utils/profile-schema';
import { Logger } from '../utils';

export abstract class BaseAdapter implements VendorAdapter {
  protected logger: Logger;

  constructor(
    public readonly name: string,
    public readonly domains: string[],
    public readonly priority: number = 0
  ) {
    this.logger = new Logger(`Adapter:${name}`);
  }

  /**
   * Default domain matching - checks if URL hostname matches any configured domain
   */
  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return this.domains.some(domain => 
        hostname === domain || hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }

  /**
   * Abstract method that each adapter must implement
   */
  abstract mapFields(
    formSchema: ExtractedFormSchema, 
    profileKeys: string[]
  ): Promise<MappingResult>;

  /**
   * Common utility: Creates a field mapping with standard validation
   */
  protected createFieldMapping(
    formFieldIdx: number,
    profileKey: string,
    confidence: number,
    reasoning: string,
    field: FormFieldSchema
  ): FieldMapping {
    return {
      formFieldIdx,
      profileKey,
      confidence: Math.max(0, Math.min(1, confidence)), // Clamp to 0-1
      source: 'vendor',
      action: this.determineAction(field),
      reasoning
    };
  }

  /**
   * Determines the appropriate DOM action based on field type
   */
  protected determineAction(field: FormFieldSchema): FieldMapping['action'] {
    if (field.elementType === 'select') {
      return 'selectByText';
    }
    
    // Check if it's a dropdown-style input with options
    if (field.options && field.options.length > 0) {
      return 'selectByText';
    }
    
    return 'setValue';
  }

  /**
   * Optimized selector matching using pre-built lookup maps for O(1) performance
   */
  protected matchBySelector(
    formSchema: ExtractedFormSchema,
    expectedFields: Record<string, string>, // selector -> profileKey mapping
    confidence: number = 0.95,
    matchType: 'exact' | 'contains' = 'contains'
  ): FieldMapping[] {
    const mappings: FieldMapping[] = [];
    
    // Performance optimization: Pre-build lookup maps for O(1) access
    const selectorToIndex = this.buildSelectorLookupMap(formSchema, matchType);
    
    for (const [selector, profileKey] of Object.entries(expectedFields)) {
      const fieldIndex = selectorToIndex.get(selector.toLowerCase());
      
      if (fieldIndex !== undefined) {
        const field = formSchema.fields[fieldIndex];
        mappings.push(this.createFieldMapping(
          fieldIndex,
          profileKey,
          confidence,
          `Vendor adapter matched selector: ${selector} (${matchType})`,
          field
        ));
      }
    }
    
    return mappings;
  }

  /**
   * Optimized attribute matching using pre-built lookup maps for O(1) performance
   */
  protected matchByAttribute(
    formSchema: ExtractedFormSchema,
    attributeName: keyof FormFieldSchema['attributes'],
    expectedValues: Record<string, string>, // attributeValue -> profileKey mapping
    profileKeys: string[],
    confidence: number = 0.9,
    matchType: 'exact' | 'contains' = 'contains'
  ): FieldMapping[] {
    const mappings: FieldMapping[] = [];
    
    // Performance optimization: Pre-build attribute lookup map for O(1) access
    const attributeToIndex = this.buildAttributeLookupMap(formSchema, attributeName, matchType);
    
    for (const [attrValue, profileKey] of Object.entries(expectedValues)) {
      if (!profileKeys.includes(profileKey)) continue;
      
      const fieldIndex = attributeToIndex.get(attrValue.toLowerCase());
      
      if (fieldIndex !== undefined) {
        const field = formSchema.fields[fieldIndex];
        mappings.push(this.createFieldMapping(
          fieldIndex,
          profileKey,
          confidence,
          `Vendor adapter matched ${attributeName}: ${attrValue} (${matchType})`,
          field
        ));
      }
    }
    
    return mappings;
  }

  /**
   * Optimized label matching with synonym support using lookup maps
   */
  protected matchByLabel(
    formSchema: ExtractedFormSchema,
    profileKeys: string[],
    confidence: number = 0.8
  ): FieldMapping[] {
    const mappings: FieldMapping[] = [];
    
    // Use traditional approach for label matching since it involves more complex logic
    // Future optimization: Could pre-build synonym maps for even better performance
    for (let i = 0; i < formSchema.fields.length; i++) {
      const field = formSchema.fields[i];
      const canonicalKey = findCanonicalProfileKey(field.label, profileKeys);
      
      if (canonicalKey) {
        mappings.push(this.createFieldMapping(
          i,
          canonicalKey,
          confidence,
          `Vendor adapter label match: "${field.label}" -> "${canonicalKey}"`,
          field
        ));
      }
    }
    
    return mappings;
  }

  /**
   * Removes duplicate mappings (same form field mapped multiple times)
   * Keeps the mapping with highest confidence
   */
  protected deduplicateMappings(mappings: FieldMapping[]): FieldMapping[] {
    const fieldMappings = new Map<number, FieldMapping>();
    
    for (const mapping of mappings) {
      const existing = fieldMappings.get(mapping.formFieldIdx);
      if (!existing || mapping.confidence > existing.confidence) {
        fieldMappings.set(mapping.formFieldIdx, mapping);
      }
    }
    
    return Array.from(fieldMappings.values());
  }

  /**
   * Creates a standard MappingResult with timing and metadata
   */
  protected createMappingResult(
    mappings: FieldMapping[],
    formSchema: ExtractedFormSchema,
    startTime: number
  ): MappingResult {
    const deduplicatedMappings = this.deduplicateMappings(mappings);
    const mappedFieldIndices = new Set(deduplicatedMappings.map(m => m.formFieldIdx));
    const unmappedFields = formSchema.fields
      .map((_, idx) => idx)
      .filter(idx => !mappedFieldIndices.has(idx));

    return {
      mappings: deduplicatedMappings,
      unmappedFields,
      processingTime: Date.now() - startTime,
      source: 'vendor',
      metadata: {
        vendorAdapter: this.name
      }
    };
  }

  /**
   * Builds optimized lookup map for selector matching - O(1) performance
   */
  private buildSelectorLookupMap(
    formSchema: ExtractedFormSchema, 
    matchType: 'exact' | 'contains'
  ): Map<string, number> {
    const selectorToIndex = new Map<string, number>();
    
    formSchema.fields.forEach((field, index) => {
      const selectors = [field.selector, ...field.fallbackSelectors];
      
      for (const selector of selectors) {
        const normalizedSelector = selector.toLowerCase();
        
        if (matchType === 'exact') {
          selectorToIndex.set(normalizedSelector, index);
        } else {
          // For 'contains' mode, create entries for all meaningful substrings
          // This is a simplified approach - could be enhanced with more sophisticated indexing
          const parts = normalizedSelector.split(/[\s.,#[\]="']/);
          parts.forEach(part => {
            if (part.length > 2) { // Only index meaningful parts
              selectorToIndex.set(part, index);
            }
          });
        }
      }
    });
    
    return selectorToIndex;
  }

  /**
   * Builds optimized lookup map for attribute matching - O(1) performance
   */
  private buildAttributeLookupMap(
    formSchema: ExtractedFormSchema,
    attributeName: keyof FormFieldSchema['attributes'],
    matchType: 'exact' | 'contains'
  ): Map<string, number> {
    const attributeToIndex = new Map<string, number>();
    
    formSchema.fields.forEach((field, index) => {
      const attrValue = field.attributes[attributeName];
      
      if (attrValue && typeof attrValue === 'string') {
        const normalizedValue = attrValue.toLowerCase();
        
        if (matchType === 'exact') {
          attributeToIndex.set(normalizedValue, index);
        } else {
          // For 'contains' mode, index the full value and meaningful substrings
          attributeToIndex.set(normalizedValue, index);
          
          // Also index word parts for better matching flexibility
          const words = normalizedValue.split(/[-_\s]/);
          words.forEach((word: string) => {
            if (word.length > 2) {
              attributeToIndex.set(word, index);
            }
          });
        }
      }
    });
    
    return attributeToIndex;
  }


  //=============================================================================
  // FLUENT BUILDER INTERFACE
  //=============================================================================

  /**
   * Creates a fluent builder for chainable mapping operations
   * This provides a clean, readable API for adapter implementations
   */
  protected builder(formSchema: ExtractedFormSchema, profileKeys: string[]) {
    return new MappingBuilder(this, formSchema, profileKeys);
  }

  //=============================================================================
  // LOGGING & UTILITIES
  //=============================================================================

  /**
   * Logs adapter performance and results
   */
  protected logMappingResult(result: MappingResult, formSchema: ExtractedFormSchema): void {
    const totalFields = formSchema.fields.length;
    const mappedFields = result.mappings.length;
    const mappingRate = totalFields > 0 ? (mappedFields / totalFields * 100).toFixed(1) : '0';
    
    this.logger.info(
      `Mapped ${mappedFields}/${totalFields} fields (${mappingRate}%) in ${result.processingTime}ms`
    );
    
    if (result.mappings.length > 0) {
      this.logger.debug('Successful mappings:', 
        result.mappings.map(m => `${m.formFieldIdx} -> ${m.profileKey} (${m.confidence.toFixed(2)})`)
      );
    }
    
    if (result.unmappedFields.length > 0) {
      this.logger.debug('Unmapped field indices:', result.unmappedFields);
    }
  }
}

//=============================================================================
// FLUENT BUILDER CLASS
//=============================================================================

//=============================================================================
// FLUENT MAPPING BUILDER CLASS
//=============================================================================

/**
 * Core fluent builder for creating mapping operations in a chainable, readable way
 * This is the primary interface for all vendor adapters and provides waterfall mapping
 * to prevent conflicts and ensure highest-confidence mappings take priority
 */
export class MappingBuilder {
  private mappings: FieldMapping[] = [];
  private mappedIndices = new Set<number>();

  constructor(
    private adapter: BaseAdapter,
    private formSchema: ExtractedFormSchema,
    private profileKeys: string[]
  ) {}

  /**
   * Public accessor methods for builder to call adapter functionality
   * These delegate to the adapter's protected methods
   */
  private callMatchBySelector(
    expectedFields: Record<string, string>,
    confidence: number,
    matchType: 'exact' | 'contains'
  ): FieldMapping[] {
    // TypeScript workaround to access protected method from builder
    return (this.adapter as BaseAdapter & {
      matchBySelector: (schema: ExtractedFormSchema, fields: Record<string, string>, conf: number, type: 'exact' | 'contains') => FieldMapping[];
    }).matchBySelector(this.formSchema, expectedFields, confidence, matchType);
  }

  private callMatchByAttribute(
    attributeName: keyof FormFieldSchema['attributes'],
    expectedValues: Record<string, string>,
    confidence: number,
    matchType: 'exact' | 'contains'
  ): FieldMapping[] {
    // TypeScript workaround to access protected method from builder
    return (this.adapter as BaseAdapter & {
      matchByAttribute: (schema: ExtractedFormSchema, attr: keyof FormFieldSchema['attributes'], vals: Record<string, string>, keys: string[], conf: number, type: 'exact' | 'contains') => FieldMapping[];
    }).matchByAttribute(
      this.formSchema,
      attributeName,
      expectedValues,
      this.profileKeys,
      confidence,
      matchType
    );
  }

  private callMatchByLabel(confidence: number): FieldMapping[] {
    // TypeScript workaround to access protected method from builder
    return (this.adapter as BaseAdapter & {
      matchByLabel: (schema: ExtractedFormSchema, keys: string[], conf: number) => FieldMapping[];
    }).matchByLabel(this.formSchema, this.profileKeys, confidence);
  }

  /**
   * Match fields by CSS selectors (waterfall-aware)
   */
  matchBySelector(
    expectedFields: Record<string, string>,
    confidence: number = 0.95,
    matchType: 'exact' | 'contains' = 'contains'
  ): MappingBuilder {
    const selectorMappings = this.callMatchBySelector(expectedFields, confidence, matchType);
    this.addMappingsWithWaterfall(selectorMappings);
    return this;
  }

  /**
   * Match fields by HTML attributes (waterfall-aware)
   */
  matchByAttribute(
    attributeName: keyof FormFieldSchema['attributes'],
    expectedValues: Record<string, string>,
    confidence: number = 0.9,
    matchType: 'exact' | 'contains' = 'contains'
  ): MappingBuilder {
    const attributeMappings = this.callMatchByAttribute(
      attributeName,
      expectedValues,
      confidence,
      matchType
    );
    this.addMappingsWithWaterfall(attributeMappings);
    return this;
  }

  /**
   * Match fields by labels with synonym support (waterfall-aware)
   */
  matchByLabel(confidence: number = 0.8): MappingBuilder {
    const labelMappings = this.callMatchByLabel(confidence);
    this.addMappingsWithWaterfall(labelMappings);
    return this;
  }

  /**
   * Add custom mapping logic (waterfall-aware)
   */
  addCustomMapping(
    customMappingFn: (formSchema: ExtractedFormSchema, profileKeys: string[], mappedIndices: Set<number>) => FieldMapping[]
  ): MappingBuilder {
    const customMappings = customMappingFn(this.formSchema, this.profileKeys, new Set(this.mappedIndices));
    this.addMappingsWithWaterfall(customMappings);
    return this;
  }

  /**
   * Waterfall helper: only adds mappings for fields that haven't been mapped yet
   * This ensures higher-confidence strategies get priority
   */
  private addMappingsWithWaterfall(newMappings: FieldMapping[]): void {
    for (const mapping of newMappings) {
      if (!this.mappedIndices.has(mapping.formFieldIdx)) {
        this.mappings.push(mapping);
        this.mappedIndices.add(mapping.formFieldIdx);
      }
    }
  }

  /**
   * Filter mappings by confidence threshold
   */
  filterByConfidence(minConfidence: number): MappingBuilder {
    this.mappings = this.mappings.filter(mapping => mapping.confidence >= minConfidence);
    return this;
  }

  /**
   * Sort mappings by confidence (highest first)
   */
  sortByConfidence(): MappingBuilder {
    this.mappings.sort((a, b) => b.confidence - a.confidence);
    return this;
  }

  /**
   * Limit the number of mappings returned
   */
  limitTo(maxMappings: number): MappingBuilder {
    this.mappings = this.mappings.slice(0, maxMappings);
    return this;
  }

  /**
   * Get the final mappings (waterfall approach means no deduplication needed)
   */
  getMappings(): FieldMapping[] {
    return [...this.mappings];
  }

  /**
   * Get the raw mappings without deduplication
   */
  getRawMappings(): FieldMapping[] {
    return [...this.mappings];
  }

  /**
   * Get indices of fields that have been mapped so far
   */
  getMappedIndices(): Set<number> {
    return new Set(this.mappedIndices);
  }

  /**
   * Get indices of fields that still need mapping
   */
  getUnmappedIndices(): number[] {
    const allIndices = Array.from({ length: this.formSchema.fields.length }, (_, i) => i);
    return allIndices.filter(idx => !this.mappedIndices.has(idx));
  }

  /**
   * Check how many fields have been mapped
   */
  getMappingProgress(): { mapped: number; total: number; percentage: number } {
    const mapped = this.mappedIndices.size;
    const total = this.formSchema.fields.length;
    const percentage = total > 0 ? (mapped / total) * 100 : 0;
    
    return { mapped, total, percentage };
  }

  /**
   * Get statistics about the current mappings
   */
  getStats(): {
    totalMappings: number;
    averageConfidence: number;
    highConfidenceCount: number; // >= 0.8
    mediumConfidenceCount: number; // 0.5 - 0.8
    lowConfidenceCount: number; // < 0.5
  } {
    const total = this.mappings.length;
    const avgConfidence = total > 0 
      ? this.mappings.reduce((sum, m) => sum + m.confidence, 0) / total 
      : 0;
    
    const high = this.mappings.filter(m => m.confidence >= 0.8).length;
    const medium = this.mappings.filter(m => m.confidence >= 0.5 && m.confidence < 0.8).length;
    const low = this.mappings.filter(m => m.confidence < 0.5).length;

    return {
      totalMappings: total,
      averageConfidence: avgConfidence,
      highConfidenceCount: high,
      mediumConfidenceCount: medium,
      lowConfidenceCount: low
    };
  }
}