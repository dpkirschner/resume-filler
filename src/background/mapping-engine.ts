/**
 * Mapping Engine - Three-Tiered Orchestrator
 * Coordinates the waterfall mapping approach:
 * Tier 1: Vendor Adapters → Tier 2: Heuristic Mapping → Tier 3: LLM Fallback
 */

import { 
  ExtractedFormSchema, 
  MappingResult, 
  UserProfile,
  FieldMapping 
} from '../types';
import { getVendorAdapter, VENDOR_ADAPTERS } from '../adapters';
import { HeuristicMapper, HeuristicMapperConfig, getProfileKeys } from '../mapping';
import { Logger } from '../utils';

export interface MappingEngineConfig {
  enableVendorAdapters: boolean;
  enableHeuristicMapping: boolean;
  enableLLMFallback: boolean;
  heuristicConfig?: HeuristicMapperConfig;
  performance: {
    maxMappingTime: number; // Maximum time to spend on mapping (ms)
    enableParallelTiers: boolean; // Run multiple tiers in parallel
  };
  thresholds: {
    vendorAdapterMinSuccess: number; // Min success rate to skip heuristic (0-1)
    heuristicMinSuccess: number; // Min success rate to skip LLM (0-1)
    overallMinConfidence: number; // Filter out low-confidence mappings
  };
}

export const DEFAULT_MAPPING_CONFIG: MappingEngineConfig = {
  enableVendorAdapters: true,
  enableHeuristicMapping: true,
  enableLLMFallback: false, // Disabled for MVP - will be added in Phase 3
  performance: {
    maxMappingTime: 5000, // 5 seconds max
    enableParallelTiers: false // Sequential for MVP
  },
  thresholds: {
    vendorAdapterMinSuccess: 0.8, // If vendor maps 80%+, skip heuristic
    heuristicMinSuccess: 0.7, // If heuristic maps 70%+, skip LLM
    overallMinConfidence: 0.3 // Filter mappings below 30% confidence
  }
};

export class MappingEngine {
  private heuristicMapper: HeuristicMapper;
  private logger: Logger;

  constructor(
    private config: MappingEngineConfig = DEFAULT_MAPPING_CONFIG
  ) {
    this.heuristicMapper = new HeuristicMapper(config.heuristicConfig);
    this.logger = new Logger('MappingEngine');
  }

  /**
   * Main entry point - maps form fields to profile keys using three-tiered approach
   */
  async mapFormFields(
    formSchema: ExtractedFormSchema,
    userProfile: UserProfile
  ): Promise<MappingResult> {
    const startTime = Date.now();
    const url = formSchema.url;
    
    this.logger.info(`Starting mapping for ${formSchema.fields.length} fields from ${url}`);

    try {
      // Tier 1: Try vendor adapters first
      if (this.config.enableVendorAdapters) {
        const vendorResult = await this.tryVendorAdapters(formSchema, userProfile);
        
        if (vendorResult && this.isResultSufficient(vendorResult, formSchema)) {
          this.logger.info(`Vendor adapter provided sufficient mapping (${vendorResult.mappings.length}/${formSchema.fields.length} fields)`);
          return this.finalizeResult(vendorResult, startTime);
        }
        
        // If vendor adapter partially succeeded, combine with other tiers
        if (vendorResult && vendorResult.mappings.length > 0) {
          this.logger.debug(`Vendor adapter partially succeeded, continuing with hybrid approach`);
          return await this.hybridMapping(formSchema, userProfile, vendorResult, startTime);
        }
      }

      // Tier 2: Heuristic mapping
      if (this.config.enableHeuristicMapping) {
        const heuristicResult = await this.tryHeuristicMapping(formSchema, userProfile);
        
        if (heuristicResult && this.isResultSufficient(heuristicResult, formSchema)) {
          this.logger.info(`Heuristic mapping provided sufficient results (${heuristicResult.mappings.length}/${formSchema.fields.length} fields)`);
          return this.finalizeResult(heuristicResult, startTime);
        }
        
        // Tier 3: LLM fallback (if enabled and heuristic insufficient)
        if (this.config.enableLLMFallback && heuristicResult) {
          return await this.tryLLMFallback(formSchema, userProfile, heuristicResult, startTime);
        }
        
        if (heuristicResult) {
          return this.finalizeResult(heuristicResult, startTime);
        }
      }

      // If all tiers fail, return empty result
      return this.createEmptyResult(formSchema, startTime);

    } catch (error) {
      this.logger.error('Mapping engine error:', error);
      return this.createErrorResult(formSchema, startTime, error);
    }
  }

  /**
   * Attempts vendor adapter mapping (Tier 1)
   */
  private async tryVendorAdapters(
    formSchema: ExtractedFormSchema,
    userProfile: UserProfile
  ): Promise<MappingResult | null> {
    const adapter = getVendorAdapter(formSchema.url);
    
    if (!adapter) {
      this.logger.debug('No vendor adapter found for URL:', formSchema.url);
      return null;
    }

    this.logger.debug(`Trying vendor adapter: ${adapter.name}`);
    
    try {
      const profileKeys = getProfileKeys(userProfile);
      const result = await adapter.mapFields(formSchema, profileKeys);
      
      // Add adapter metadata
      result.metadata = {
        ...result.metadata,
        vendorAdapter: adapter.name
      };
      
      return result;
    } catch (error) {
      this.logger.error(`Vendor adapter ${adapter.name} failed:`, error);
      return null;
    }
  }

  /**
   * Attempts heuristic mapping (Tier 2)
   */
  private async tryHeuristicMapping(
    formSchema: ExtractedFormSchema,
    userProfile: UserProfile
  ): Promise<MappingResult | null> {
    this.logger.debug('Starting heuristic mapping');
    
    try {
      const result = await this.heuristicMapper.mapFields(formSchema, userProfile);
      return result;
    } catch (error) {
      this.logger.error('Heuristic mapping failed:', error);
      return null;
    }
  }

  /**
   * Placeholder for LLM fallback mapping (Tier 3) - will be implemented in Phase 3
   */
  private async tryLLMFallback(
    _formSchema: ExtractedFormSchema,
    _userProfile: UserProfile,
    previousResult: MappingResult,
    _startTime: number
  ): Promise<MappingResult> {
    this.logger.debug('LLM fallback not yet implemented - returning heuristic result');
    
    // For now, just return the heuristic result with updated metadata
    return {
      ...previousResult,
      metadata: {
        ...previousResult.metadata,
        fallbackReason: 'LLM fallback not yet implemented'
      }
    };
  }

  /**
   * Combines results from multiple tiers for hybrid mapping
   */
  private async hybridMapping(
    formSchema: ExtractedFormSchema,
    userProfile: UserProfile,
    vendorResult: MappingResult,
    startTime: number
  ): Promise<MappingResult> {
    this.logger.debug('Starting hybrid mapping approach');
    
    const combinedMappings: FieldMapping[] = [...vendorResult.mappings];
    const vendorMappedFields = new Set(vendorResult.mappings.map(m => m.formFieldIdx));
    
    // Run heuristic mapping on remaining unmapped fields
    if (this.config.enableHeuristicMapping) {
      const unmappedFields = formSchema.fields.filter((_, idx) => !vendorMappedFields.has(idx));
      
      if (unmappedFields.length > 0) {
        const partialSchema: ExtractedFormSchema = {
          ...formSchema,
          fields: unmappedFields
        };
        
        const heuristicResult = await this.tryHeuristicMapping(partialSchema, userProfile);
        
        if (heuristicResult) {
          // Adjust field indices to match original schema
          const adjustedMappings = heuristicResult.mappings.map(mapping => {
            const originalIdx = formSchema.fields.indexOf(unmappedFields[mapping.formFieldIdx]);
            return {
              ...mapping,
              formFieldIdx: originalIdx,
              reasoning: `Hybrid: ${mapping.reasoning}`
            };
          });
          
          combinedMappings.push(...adjustedMappings);
        }
      }
    }

    // Create combined result
    const mappedFieldIndices = new Set(combinedMappings.map(m => m.formFieldIdx));
    const unmappedFields = formSchema.fields
      .map((_, idx) => idx)
      .filter(idx => !mappedFieldIndices.has(idx));

    return {
      mappings: this.filterAndDeduplicateMappings(combinedMappings),
      unmappedFields,
      processingTime: Date.now() - startTime,
      source: 'hybrid',
      metadata: {
        vendorAdapter: vendorResult.metadata?.vendorAdapter,
        fallbackReason: 'Hybrid: vendor + heuristic mapping'
      }
    };
  }

  /**
   * Checks if a mapping result is sufficient to skip further tiers
   */
  private isResultSufficient(result: MappingResult, formSchema: ExtractedFormSchema): boolean {
    const totalFields = formSchema.fields.length;
    const mappedFields = result.mappings.length;
    const successRate = totalFields > 0 ? mappedFields / totalFields : 0;
    
    const threshold = result.source === 'vendor' 
      ? this.config.thresholds.vendorAdapterMinSuccess
      : this.config.thresholds.heuristicMinSuccess;
    
    return successRate >= threshold;
  }

  /**
   * Filters mappings by confidence and removes duplicates
   */
  private filterAndDeduplicateMappings(mappings: FieldMapping[]): FieldMapping[] {
    // Group by form field index
    const fieldMappings = new Map<number, FieldMapping>();
    
    for (const mapping of mappings) {
      // Filter by minimum confidence
      if (mapping.confidence < this.config.thresholds.overallMinConfidence) {
        continue;
      }
      
      const existing = fieldMappings.get(mapping.formFieldIdx);
      
      // Keep highest confidence mapping for each field
      if (!existing || mapping.confidence > existing.confidence) {
        fieldMappings.set(mapping.formFieldIdx, mapping);
      }
    }
    
    return Array.from(fieldMappings.values())
      .sort((a, b) => a.formFieldIdx - b.formFieldIdx);
  }

  /**
   * Finalizes result with timing and validation
   */
  private finalizeResult(result: MappingResult, startTime: number): MappingResult {
    const finalResult = {
      ...result,
      mappings: this.filterAndDeduplicateMappings(result.mappings),
      processingTime: Date.now() - startTime
    };

    this.logFinalResult(finalResult);
    return finalResult;
  }

  /**
   * Creates empty result when all mapping fails
   */
  private createEmptyResult(formSchema: ExtractedFormSchema, startTime: number): MappingResult {
    return {
      mappings: [],
      unmappedFields: formSchema.fields.map((_, idx) => idx),
      processingTime: Date.now() - startTime,
      source: 'vendor', // Default source
      metadata: {
        fallbackReason: 'All mapping tiers failed or disabled'
      }
    };
  }

  /**
   * Creates error result
   */
  private createErrorResult(
    formSchema: ExtractedFormSchema, 
    startTime: number, 
    error: Error | unknown
  ): MappingResult {
    return {
      mappings: [],
      unmappedFields: formSchema.fields.map((_, idx) => idx),
      processingTime: Date.now() - startTime,
      source: 'vendor',
      metadata: {
        fallbackReason: `Mapping error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    };
  }

  /**
   * Logs comprehensive final results
   */
  private logFinalResult(result: MappingResult): void {
    const { mappings, unmappedFields, processingTime, source } = result;
    const totalFields = mappings.length + unmappedFields.length;
    const successRate = totalFields > 0 ? (mappings.length / totalFields * 100).toFixed(1) : '0';
    
    this.logger.info(
      `Mapping complete: ${mappings.length}/${totalFields} fields (${successRate}%) ` +
      `using ${source} in ${processingTime}ms`
    );
    
    if (mappings.length > 0) {
      const avgConfidence = (mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length).toFixed(3);
      this.logger.debug(`Average confidence: ${avgConfidence}`);
      
      // Log confidence distribution
      const highConf = mappings.filter(m => m.confidence >= 0.8).length;
      const medConf = mappings.filter(m => m.confidence >= 0.5 && m.confidence < 0.8).length;
      const lowConf = mappings.filter(m => m.confidence < 0.5).length;
      this.logger.debug(`Confidence distribution: ${highConf} high, ${medConf} medium, ${lowConf} low`);
    }
    
    if (result.metadata?.fallbackReason) {
      this.logger.debug('Fallback reason:', result.metadata.fallbackReason);
    }
  }

  /**
   * Updates configuration
   */
  updateConfig(newConfig: Partial<MappingEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets available vendor adapters for debugging
   */
  getAvailableAdapters(): string[] {
    return VENDOR_ADAPTERS.map(adapter => adapter.name);
  }

  /**
   * Gets current configuration
   */
  getConfig(): MappingEngineConfig {
    return { ...this.config };
  }
}