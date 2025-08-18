/**
 * Heuristic Mapping Engine
 * Main Tier 2 mapper that uses attribute-based scoring and pattern matching
 * to map form fields to profile keys when vendor adapters don't apply
 */

import { 
  ExtractedFormSchema, 
  MappingResult, 
  FieldMapping, 
  UserProfile,
  HeuristicMappingStats,
  FormFieldSchema,
  HeuristicWeights
} from '../types';
import { HeuristicScorer } from './heuristic-scorer';
import { ProfileMatcher } from './profile-matcher';
import { Logger } from '../utils';

export interface HeuristicMapperConfig {
  minConfidence: number;        // Minimum confidence to accept a mapping
  maxMappingsPerField: number;  // Max alternative mappings per field
  enableWorkExperience: boolean; // Enable work experience sub-field mapping
  enableAddressDecomposition: boolean; // Enable address component mapping
  enableRepeatableSections: boolean; // Enable repeatable section detection
  confidenceThresholds: {
    high: number;    // High confidence threshold (>= 0.8)
    medium: number;  // Medium confidence threshold (>= 0.5)
    low: number;     // Low confidence threshold (>= 0.3)
  };
}

export const DEFAULT_HEURISTIC_CONFIG: HeuristicMapperConfig = {
  minConfidence: 0.4,
  maxMappingsPerField: 1,
  enableWorkExperience: true,
  enableAddressDecomposition: true,
  enableRepeatableSections: false, // Disabled by default for MVP
  confidenceThresholds: {
    high: 0.8,
    medium: 0.5,
    low: 0.3
  }
};

export class HeuristicMapper {
  private scorer: HeuristicScorer;
  private matcher: ProfileMatcher;
  private logger: Logger;

  constructor(
    private config: HeuristicMapperConfig = DEFAULT_HEURISTIC_CONFIG,
    scorer?: HeuristicScorer
  ) {
    this.scorer = scorer || new HeuristicScorer();
    this.matcher = new ProfileMatcher(this.scorer);
    this.logger = new Logger('HeuristicMapper');
  }

  /**
   * Main mapping function - maps all fields in a form schema to profile keys
   */
  async mapFields(
    formSchema: ExtractedFormSchema,
    userProfile: UserProfile
  ): Promise<MappingResult> {
    const startTime = Date.now();
    this.logger.debug(`Starting heuristic mapping for ${formSchema.fields.length} fields`);

    const allMappings: FieldMapping[] = [];
    
    // Strategy 1: Standard field-by-field mapping
    const standardMappings = await this.mapStandardFields(formSchema, userProfile);
    allMappings.push(...standardMappings);

    // Strategy 2: Work experience field mapping (if enabled)
    if (this.config.enableWorkExperience) {
      const workExpMappings = this.matcher.mapWorkExperienceFields(
        formSchema.fields,
        userProfile,
        this.config.minConfidence
      );
      allMappings.push(...workExpMappings);
    }

    // Strategy 3: Address decomposition (if enabled)
    if (this.config.enableAddressDecomposition) {
      const addressMappings = this.matcher.mapAddressFields(
        formSchema.fields,
        userProfile,
        this.config.minConfidence
      );
      allMappings.push(...addressMappings);
    }

    // Strategy 4: Repeatable sections (if enabled)
    if (this.config.enableRepeatableSections) {
      const repeatableMappings = await this.mapRepeatableSections(formSchema, userProfile);
      allMappings.push(...repeatableMappings);
    }

    const result = this.createMappingResult(allMappings, formSchema, startTime);
    this.logMappingResult(result, formSchema);

    return result;
  }

  /**
   * Maps individual fields using standard scoring techniques
   */
  private async mapStandardFields(
    formSchema: ExtractedFormSchema,
    userProfile: UserProfile
  ): Promise<FieldMapping[]> {
    const mappings: FieldMapping[] = [];

    for (let fieldIdx = 0; fieldIdx < formSchema.fields.length; fieldIdx++) {
      const field = formSchema.fields[fieldIdx];
      
      // Find best matches for this field
      const matches = this.matcher.findMatches(field, userProfile, {
        maxCandidates: this.config.maxMappingsPerField,
        minConfidence: this.config.minConfidence,
        includeSensitive: false // Standard mapping excludes sensitive fields
      });

      // Convert matches to field mappings
      for (const match of matches) {
        mappings.push({
          formFieldIdx: fieldIdx,
          profileKey: match.profileKey,
          confidence: match.confidence,
          source: 'heuristic',
          action: this.determineAction(field),
          reasoning: `Heuristic mapping: ${match.reasoning}`
        });
      }
    }

    return mappings;
  }

  /**
   * Handles repeatable sections like multiple work experiences
   */
  private async mapRepeatableSections(
    formSchema: ExtractedFormSchema,
    userProfile: UserProfile
  ): Promise<FieldMapping[]> {
    const mappings: FieldMapping[] = [];
    
    const { sections, sectionType } = this.matcher.detectRepeatableSections(formSchema.fields);
    
    if (sections.length === 0) {
      return mappings;
    }

    this.logger.debug(`Detected ${sections.length} repeatable sections of type: ${sectionType}`);

    // Map each section independently
    for (let sectionIdx = 0; sectionIdx < sections.length; sectionIdx++) {
      const section = sections[sectionIdx];
      
      for (const field of section) {
        const fieldIdx = formSchema.fields.indexOf(field);
        if (fieldIdx === -1) continue;

        // Create section-specific profile key
        const matches = this.matcher.findMatches(field, userProfile, {
          maxCandidates: 1,
          minConfidence: this.config.minConfidence,
          includeSensitive: false
        });

        if (matches.length > 0) {
          const match = matches[0];
          const sectionProfileKey = `${match.profileKey}[${sectionIdx}]`;
          
          mappings.push({
            formFieldIdx: fieldIdx,
            profileKey: sectionProfileKey,
            confidence: match.confidence * 0.9, // Slightly reduce confidence for sections
            source: 'heuristic',
            action: this.determineAction(field),
            reasoning: `Repeatable section (${sectionType}): ${match.reasoning}`
          });
        }
      }
    }

    return mappings;
  }

  /**
   * Determines appropriate DOM action for a field
   */
  private determineAction(field: FormFieldSchema): FieldMapping['action'] {
    if (field.elementType === 'select') {
      return 'selectByText';
    }
    
    if (field.options && field.options.length > 0) {
      return 'selectByText';
    }
    
    return 'setValue';
  }

  /**
   * Removes duplicate mappings and applies confidence filtering
   */
  private deduplicateMappings(mappings: FieldMapping[]): FieldMapping[] {
    const fieldMappings = new Map<number, FieldMapping>();
    
    for (const mapping of mappings) {
      const existing = fieldMappings.get(mapping.formFieldIdx);
      
      // Keep mapping with higher confidence, or first one if equal
      if (!existing || mapping.confidence > existing.confidence) {
        fieldMappings.set(mapping.formFieldIdx, mapping);
      }
    }
    
    return Array.from(fieldMappings.values())
      .filter(mapping => mapping.confidence >= this.config.minConfidence);
  }

  /**
   * Creates comprehensive mapping statistics
   */
  private generateMappingStats(
    mappings: FieldMapping[],
    totalFields: number,
    processingTime: number
  ): HeuristicMappingStats {
    const confidenceThresholds = this.config.confidenceThresholds;
    
    return {
      totalFields,
      highConfidenceMatches: mappings.filter(m => m.confidence >= confidenceThresholds.high).length,
      mediumConfidenceMatches: mappings.filter(m => 
        m.confidence >= confidenceThresholds.medium && m.confidence < confidenceThresholds.high
      ).length,
      lowConfidenceMatches: mappings.filter(m => 
        m.confidence >= confidenceThresholds.low && m.confidence < confidenceThresholds.medium
      ).length,
      averageConfidence: mappings.length > 0 
        ? mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length 
        : 0,
      processingTimeMs: processingTime
    };
  }

  /**
   * Creates final mapping result with metadata
   */
  private createMappingResult(
    mappings: FieldMapping[],
    formSchema: ExtractedFormSchema,
    startTime: number
  ): MappingResult {
    const deduplicatedMappings = this.deduplicateMappings(mappings);
    const mappedFieldIndices = new Set(deduplicatedMappings.map(m => m.formFieldIdx));
    const unmappedFields = formSchema.fields
      .map((_, idx) => idx)
      .filter(idx => !mappedFieldIndices.has(idx));

    const processingTime = Date.now() - startTime;
    const stats = this.generateMappingStats(deduplicatedMappings, formSchema.fields.length, processingTime);

    return {
      mappings: deduplicatedMappings,
      unmappedFields,
      processingTime,
      source: 'heuristic',
      metadata: {
        heuristicStats: stats,
        fallbackReason: 'No vendor adapter matched - using heuristic mapping'
      }
    };
  }

  /**
   * Logs detailed mapping results
   */
  private logMappingResult(result: MappingResult, formSchema: ExtractedFormSchema): void {
    const stats = result.metadata?.heuristicStats;
    if (!stats) return;

    const totalFields = formSchema.fields.length;
    const mappedFields = result.mappings.length;
    const mappingRate = totalFields > 0 ? (mappedFields / totalFields * 100).toFixed(1) : '0';
    
    this.logger.info(
      `Heuristic mapping: ${mappedFields}/${totalFields} fields (${mappingRate}%) in ${result.processingTime}ms`
    );
    
    this.logger.debug('Confidence distribution:', {
      high: stats.highConfidenceMatches,
      medium: stats.mediumConfidenceMatches, 
      low: stats.lowConfidenceMatches,
      average: stats.averageConfidence.toFixed(3)
    });

    if (result.mappings.length > 0) {
      this.logger.debug('Top mappings:', 
        result.mappings
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 5)
          .map(m => `${m.formFieldIdx} -> ${m.profileKey} (${m.confidence.toFixed(2)})`)
      );
    }
    
    if (result.unmappedFields.length > 0) {
      this.logger.debug(`Unmapped fields: ${result.unmappedFields.length}`, result.unmappedFields);
    }
  }

  /**
   * Updates configuration
   */
  updateConfig(newConfig: Partial<HeuristicMapperConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current configuration
   */
  getConfig(): HeuristicMapperConfig {
    return { ...this.config };
  }

  /**
   * Updates scoring weights in the underlying scorer
   */
  updateScoringWeights(weights: Partial<HeuristicWeights>): void {
    this.matcher.updateScoringWeights(weights);
  }
}