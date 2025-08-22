/**
 * Base Strategy Interface and Implementation
 * Defines the contract for all mapping strategies and provides common functionality
 */

import { ExtractedFormSchema, FieldMapping, FormFieldSchema } from '../../types';
import { ConfidenceUtils } from '../shared/confidence-constants';

/**
 * Context provided to strategies for mapping operations
 */
export interface StrategyContext {
  /** Form schema being processed */
  readonly formSchema: ExtractedFormSchema;
  
  /** Available profile keys to map to */
  readonly profileKeys: string[];
  
  /** Fields that have already been mapped (for waterfall) */
  readonly mappedIndices: Set<number>;
  
  /** Additional context parameters */
  readonly params?: Record<string, unknown>;
}

/**
 * Result of a strategy execution
 */
export interface StrategyResult {
  /** Successful field mappings */
  readonly mappings: FieldMapping[];
  
  /** Processing time in milliseconds */
  readonly processingTime: number;
  
  /** Strategy-specific metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Base interface that all mapping strategies must implement
 */
export interface MappingStrategy {
  /** Unique identifier for this strategy */
  readonly id: string;
  
  /** Human-readable strategy name */
  readonly name: string;
  
  /** Strategy type category */
  readonly type: 'attribute' | 'selector' | 'label' | 'custom';
  
  /** Whether this strategy supports waterfall mapping */
  readonly supportsWaterfall: boolean;
  
  /** Executes the mapping strategy */
  execute(context: StrategyContext): Promise<StrategyResult>;
  
  /** Validates strategy configuration */
  validate(): string[];
  
  /** Gets strategy configuration for debugging */
  getConfig(): Record<string, unknown>;
}

/**
 * Abstract base class providing common strategy functionality
 */
export abstract class BaseStrategy implements MappingStrategy {
  public readonly supportsWaterfall = true;
  
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: 'attribute' | 'selector' | 'label' | 'custom'
  ) {}
  
  /**
   * Template method that handles timing and common logic
   */
  async execute(context: StrategyContext): Promise<StrategyResult> {
    const startTime = performance.now();
    
    try {
      const mappings = await this.executeStrategy(context);
      const processingTime = performance.now() - startTime;
      
      return {
        mappings: this.validateMappings(mappings),
        processingTime,
        metadata: {
          strategyId: this.id,
          strategyType: this.type,
          fieldsProcessed: context.formSchema.fields.length,
          mappingsFound: mappings.length
        }
      };
    } catch (error) {
      const processingTime = performance.now() - startTime;
      
      return {
        mappings: [],
        processingTime,
        metadata: {
          strategyId: this.id,
          strategyType: this.type,
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
  
  /**
   * Abstract method that subclasses must implement
   */
  protected abstract executeStrategy(context: StrategyContext): Promise<FieldMapping[]>;
  
  /**
   * Default validation - can be overridden by subclasses
   */
  validate(): string[] {
    const errors: string[] = [];
    
    if (!this.id || this.id.trim().length === 0) {
      errors.push('Strategy ID is required');
    }
    
    if (!this.name || this.name.trim().length === 0) {
      errors.push('Strategy name is required');
    }
    
    return errors;
  }
  
  /**
   * Default configuration getter - can be overridden by subclasses
   */
  getConfig(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      supportsWaterfall: this.supportsWaterfall
    };
  }
  
  /**
   * Helper method to create field mappings with consistent structure
   */
  protected createFieldMapping(
    formFieldIdx: number,
    profileKey: string,
    confidence: number,
    reasoning: string,
    field: FormFieldSchema,
    source: 'vendor' | 'heuristic' | 'llm' = 'vendor'
  ): FieldMapping {
    return {
      formFieldIdx,
      profileKey,
      confidence: ConfidenceUtils.clampConfidence(confidence),
      source,
      action: this.determineAction(field),
      reasoning: `${this.name}: ${reasoning}`
    };
  }
  
  /**
   * Determines the appropriate DOM action based on field type
   */
  protected determineAction(field: FormFieldSchema): FieldMapping['action'] {
    if (field.elementType === 'select') {
      return 'selectByText';
    }
    
    if (field.options && field.options.length > 0) {
      return 'selectByText';
    }
    
    return 'setValue';
  }
  
  /**
   * Validates mappings and filters out invalid ones
   */
  protected validateMappings(mappings: FieldMapping[]): FieldMapping[] {
    return mappings.filter(mapping => {
      // Basic validation
      if (mapping.formFieldIdx < 0) return false;
      if (!mapping.profileKey || mapping.profileKey.trim().length === 0) return false;
      if (!ConfidenceUtils.validateConfidence(mapping.confidence)) return false;
      
      return true;
    });
  }
  
  /**
   * Helper to check if a field index is already mapped (waterfall support)
   */
  protected isFieldMapped(fieldIndex: number, mappedIndices: Set<number>): boolean {
    return mappedIndices.has(fieldIndex);
  }
  
  /**
   * Helper to normalize text for matching
   */
  protected normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, ' ');
  }
  
  /**
   * Helper to check if profile key is available
   */
  protected isProfileKeyAvailable(profileKey: string, profileKeys: string[]): boolean {
    return profileKeys.includes(profileKey);
  }
}

/**
 * Strategy factory for creating strategy instances
 */
export class StrategyFactory {
  private static strategies = new Map<string, () => MappingStrategy>();
  
  /**
   * Registers a strategy constructor
   */
  static register(id: string, constructor: () => MappingStrategy): void {
    this.strategies.set(id, constructor);
  }
  
  /**
   * Creates a strategy instance by ID
   */
  static create(id: string): MappingStrategy | null {
    const constructor = this.strategies.get(id);
    return constructor ? constructor() : null;
  }
  
  /**
   * Gets all registered strategy IDs
   */
  static getRegisteredIds(): string[] {
    return Array.from(this.strategies.keys());
  }
  
  /**
   * Clears all registered strategies (mainly for testing)
   */
  static clear(): void {
    this.strategies.clear();
  }
}

/**
 * Strategy execution utilities
 */
export class StrategyExecutor {
  /**
   * Executes multiple strategies in sequence with waterfall support
   */
  static async executeStrategies(
    strategies: MappingStrategy[],
    context: StrategyContext
  ): Promise<{
    mappings: FieldMapping[];
    results: StrategyResult[];
    totalTime: number;
  }> {
    const startTime = performance.now();
    const allMappings: FieldMapping[] = [];
    const results: StrategyResult[] = [];
    const mappedIndices = new Set(context.mappedIndices);
    
    for (const strategy of strategies) {
      const strategyContext: StrategyContext = {
        ...context,
        mappedIndices: new Set(mappedIndices)
      };
      
      const result = await strategy.execute(strategyContext);
      results.push(result);
      
      // Add new mappings and update mapped indices for waterfall
      for (const mapping of result.mappings) {
        if (!mappedIndices.has(mapping.formFieldIdx)) {
          allMappings.push(mapping);
          mappedIndices.add(mapping.formFieldIdx);
        }
      }
    }
    
    return {
      mappings: allMappings,
      results,
      totalTime: performance.now() - startTime
    };
  }
  
  /**
   * Executes strategies in parallel (no waterfall support)
   */
  static async executeStrategiesParallel(
    strategies: MappingStrategy[],
    context: StrategyContext
  ): Promise<{
    mappings: FieldMapping[];
    results: StrategyResult[];
    totalTime: number;
  }> {
    const startTime = performance.now();
    
    const results = await Promise.all(
      strategies.map(strategy => strategy.execute(context))
    );
    
    // Deduplicate mappings by keeping highest confidence for each field
    const mappingsByField = new Map<number, FieldMapping>();
    
    for (const result of results) {
      for (const mapping of result.mappings) {
        const existing = mappingsByField.get(mapping.formFieldIdx);
        if (!existing || mapping.confidence > existing.confidence) {
          mappingsByField.set(mapping.formFieldIdx, mapping);
        }
      }
    }
    
    return {
      mappings: Array.from(mappingsByField.values()),
      results,
      totalTime: performance.now() - startTime
    };
  }
}