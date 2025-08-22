/**
 * Label-Based Mapping Strategy
 * Maps form fields based on their labels with pattern matching and synonym support
 */

import { BaseStrategy, StrategyContext } from './base-strategy';
import { FieldMapping } from '../../types';
import { LabelStrategyConfig } from '../shared/adapter-config';
import { findCanonicalProfileKey } from '../../utils/profile-schema';
import {
  CONTACT_INFO_PATTERNS,
  ADDRESS_PATTERNS,
  WORK_EXPERIENCE_PATTERNS,
  APPLICATION_PATTERNS,
  COMPREHENSIVE_PATTERNS
} from '../config/label-patterns';

/**
 * Strategy for mapping fields based on label text patterns
 */
export class LabelStrategy extends BaseStrategy {
  constructor(private config: LabelStrategyConfig) {
    super(
      'label-patterns',
      'Label Pattern Matching',
      'label'
    );
  }
  
  protected async executeStrategy(context: StrategyContext): Promise<FieldMapping[]> {
    const mappings: FieldMapping[] = [];
    const { formSchema, profileKeys, mappedIndices } = context;
    
    for (let fieldIndex = 0; fieldIndex < formSchema.fields.length; fieldIndex++) {
      // Skip if field already mapped (waterfall support)
      if (this.isFieldMapped(fieldIndex, mappedIndices)) {
        continue;
      }
      
      const field = formSchema.fields[fieldIndex];
      const normalizedLabel = this.normalizeText(field.label);
      
      // Try pattern-based matching first
      const patternMatch = this.findPatternMatch(normalizedLabel, profileKeys);
      if (patternMatch) {
        mappings.push(this.createFieldMapping(
          fieldIndex,
          patternMatch.profileKey,
          patternMatch.confidence,
          `Pattern match: "${field.label}" -> ${patternMatch.profileKey}`,
          field
        ));
        continue;
      }
      
      // Try synonym-based matching if enabled
      if (this.config.useSynonyms) {
        const synonymMatch = this.findSynonymMatch(field.label, profileKeys);
        if (synonymMatch) {
          mappings.push(this.createFieldMapping(
            fieldIndex,
            synonymMatch,
            this.config.defaultConfidence * 0.9, // Slightly lower confidence for synonyms
            `Synonym match: "${field.label}" -> ${synonymMatch}`,
            field
          ));
        }
      }
    }
    
    return mappings;
  }
  
  /**
   * Finds a pattern match for the given label
   */
  private findPatternMatch(
    normalizedLabel: string,
    profileKeys: string[]
  ): { profileKey: string; confidence: number } | null {
    for (const patternConfig of this.config.patterns) {
      // Skip if profile key is not available
      if (!this.isProfileKeyAvailable(patternConfig.profileKey, profileKeys)) {
        continue;
      }
      
      // Check if any pattern matches the label
      const matches = patternConfig.patterns.some(pattern => 
        normalizedLabel.includes(this.normalizeText(pattern))
      );
      
      if (matches) {
        return {
          profileKey: patternConfig.profileKey,
          confidence: patternConfig.confidence || this.config.defaultConfidence
        };
      }
    }
    
    return null;
  }
  
  /**
   * Finds a synonym match using the profile schema utility
   */
  private findSynonymMatch(label: string, profileKeys: string[]): string | null {
    return findCanonicalProfileKey(label, profileKeys);
  }
  
  /**
   * Validates the label strategy configuration
   */
  validate(): string[] {
    const errors = super.validate();
    
    if (!this.config.patterns || this.config.patterns.length === 0) {
      errors.push('At least one label pattern must be specified');
    }
    
    if (this.config.defaultConfidence < 0 || this.config.defaultConfidence > 1) {
      errors.push('Default confidence must be between 0 and 1');
    }
    
    // Validate individual patterns
    this.config.patterns.forEach((pattern, index) => {
      if (!pattern.patterns || pattern.patterns.length === 0) {
        errors.push(`Pattern at index ${index} must have at least one pattern string`);
      }
      
      if (!pattern.profileKey || pattern.profileKey.trim().length === 0) {
        errors.push(`Pattern at index ${index} must have a profile key`);
      }
      
      if (pattern.confidence !== undefined && 
          (pattern.confidence < 0 || pattern.confidence > 1)) {
        errors.push(`Pattern at index ${index} confidence must be between 0 and 1`);
      }
      
      // Check for empty pattern strings
      pattern.patterns.forEach((patternStr, patternIndex) => {
        if (!patternStr || patternStr.trim().length === 0) {
          errors.push(`Pattern ${index}.${patternIndex} cannot be empty`);
        }
      });
    });
    
    return errors;
  }
  
  /**
   * Gets strategy configuration for debugging
   */
  getConfig(): Record<string, unknown> {
    return {
      ...super.getConfig(),
      patternCount: this.config.patterns.length,
      defaultConfidence: this.config.defaultConfidence,
      useSynonyms: this.config.useSynonyms,
      patterns: this.config.patterns.map(p => ({
        profileKey: p.profileKey,
        patternCount: p.patterns.length,
        confidence: p.confidence
      }))
    };
  }
}

/**
 * Factory for creating common label strategies
 */
export class LabelStrategyFactory {
  /**
   * Creates a basic contact information label strategy
   */
  static createContactInfoStrategy(confidence = 0.8): LabelStrategy {
    return new LabelStrategy({
      patterns: CONTACT_INFO_PATTERNS,
      defaultConfidence: confidence,
      useSynonyms: true
    });
  }
  
  /**
   * Creates an address information label strategy
   */
  static createAddressStrategy(confidence = 0.8): LabelStrategy {
    return new LabelStrategy({
      patterns: ADDRESS_PATTERNS,
      defaultConfidence: confidence,
      useSynonyms: true
    });
  }
  
  /**
   * Creates a work experience label strategy
   */
  static createWorkExperienceStrategy(confidence = 0.8): LabelStrategy {
    return new LabelStrategy({
      patterns: WORK_EXPERIENCE_PATTERNS,
      defaultConfidence: confidence,
      useSynonyms: true
    });
  }
  
  /**
   * Creates a application-specific label strategy
   */
  static createApplicationStrategy(confidence = 0.8): LabelStrategy {
    return new LabelStrategy({
      patterns: APPLICATION_PATTERNS,
      defaultConfidence: confidence,
      useSynonyms: true
    });
  }
  
  /**
   * Creates a comprehensive label strategy combining all common patterns
   */
  static createComprehensiveStrategy(confidence = 0.8): LabelStrategy {
    return new LabelStrategy({
      patterns: COMPREHENSIVE_PATTERNS,
      defaultConfidence: confidence,
      useSynonyms: true
    });
  }
}