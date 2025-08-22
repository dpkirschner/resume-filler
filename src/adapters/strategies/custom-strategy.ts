/**
 * Custom Mapping Strategy Template
 * Provides a base for vendor-specific custom mapping logic
 */

import { BaseStrategy, StrategyContext } from './base-strategy';
import { FieldMapping, FormFieldSchema } from '../../types';
import { CustomStrategyConfig } from '../shared/adapter-config';

/**
 * Custom mapping function type
 */
export type CustomMappingFunction = (
  formSchema: import('../../types').ExtractedFormSchema,
  profileKeys: string[],
  mappedIndices: Set<number>,
  params: Record<string, unknown>
) => FieldMapping[];

/**
 * Strategy for vendor-specific custom mapping logic
 */
export class CustomStrategy extends BaseStrategy {
  constructor(
    private config: CustomStrategyConfig,
    private mappingFunction: CustomMappingFunction
  ) {
    super(
      `custom-${config.name}`,
      `Custom Strategy: ${config.name}`,
      'custom'
    );
  }
  
  protected async executeStrategy(context: StrategyContext): Promise<FieldMapping[]> {
    const { formSchema, profileKeys, mappedIndices } = context;
    
    try {
      const mappings = this.mappingFunction(
        formSchema,
        profileKeys,
        mappedIndices,
        this.config.params
      );
      
      // Apply base confidence to all mappings that don't have explicit confidence
      return mappings.map(mapping => ({
        ...mapping,
        confidence: mapping.confidence || this.config.baseConfidence,
        reasoning: mapping.reasoning ? 
          `${this.name}: ${mapping.reasoning}` : 
          `${this.name}: Custom mapping logic`
      }));
    } catch {
      // Return empty array on error - error handling is done in base class
      return [];
    }
  }
  
  /**
   * Validates the custom strategy configuration
   */
  validate(): string[] {
    const errors = super.validate();
    
    if (!this.config.name || this.config.name.trim().length === 0) {
      errors.push('Custom strategy name is required');
    }
    
    if (this.config.baseConfidence < 0 || this.config.baseConfidence > 1) {
      errors.push('Base confidence must be between 0 and 1');
    }
    
    if (typeof this.mappingFunction !== 'function') {
      errors.push('Mapping function must be provided');
    }
    
    return errors;
  }
  
  /**
   * Gets strategy configuration for debugging
   */
  getConfig(): Record<string, unknown> {
    return {
      ...super.getConfig(),
      customName: this.config.name,
      baseConfidence: this.config.baseConfidence,
      params: this.config.params,
      hasMappingFunction: typeof this.mappingFunction === 'function'
    };
  }
}

/**
 * Factory for creating common custom strategies
 */
export class CustomStrategyFactory {
  /**
   * Creates a file upload detection strategy
   */
  static createFileUploadStrategy(
    resumeProfileKey = 'Resume',
    confidence = 0.9
  ): CustomStrategy {
    const mappingFunction: CustomMappingFunction = (
      formSchema,
      profileKeys,
      mappedIndices
    ) => {
      const mappings: FieldMapping[] = [];
      
      if (!profileKeys.includes(resumeProfileKey)) {
        return mappings;
      }
      
      formSchema.fields.forEach((field: FormFieldSchema, index: number) => {
        if (mappedIndices.has(index)) return;
        
        if (field.attributes.type === 'file') {
          mappings.push({
            formFieldIdx: index,
            profileKey: resumeProfileKey,
            confidence,
            source: 'vendor' as const,
            action: 'setValue' as const,
            reasoning: 'File input detected as resume upload'
          });
        }
      });
      
      return mappings;
    };
    
    return new CustomStrategy(
      {
        name: 'file-upload-detection',
        baseConfidence: confidence,
        params: { resumeProfileKey }
      },
      mappingFunction
    );
  }
  
  /**
   * Creates a dropdown option analysis strategy
   */
  static createDropdownAnalysisStrategy(
    optionMappings: Record<string, string>,
    confidence = 0.85
  ): CustomStrategy {
    const mappingFunction: CustomMappingFunction = (
      formSchema,
      profileKeys,
      mappedIndices,
      _params
    ) => {
      const mappings: FieldMapping[] = [];
      
      formSchema.fields.forEach((field: FormFieldSchema, index: number) => {
        if (mappedIndices.has(index)) return;
        
        if (field.elementType === 'select' && field.options) {
          // Analyze options to determine field purpose
          const optionTexts = field.options.map(opt => opt.text.toLowerCase());
          
          for (const [pattern, profileKey] of Object.entries(optionMappings)) {
            if (!profileKeys.includes(profileKey)) continue;
            
            const hasPattern = optionTexts.some(text => 
              text.includes(pattern.toLowerCase())
            );
            
            if (hasPattern) {
              mappings.push({
                formFieldIdx: index,
                profileKey,
                confidence,
                source: 'vendor' as const,
                action: 'selectByText' as const,
                reasoning: `Dropdown with ${pattern} options detected`
              });
              break;
            }
          }
        }
      });
      
      return mappings;
    };
    
    return new CustomStrategy(
      {
        name: 'dropdown-analysis',
        baseConfidence: confidence,
        params: { optionMappings }
      },
      mappingFunction
    );
  }
  
  /**
   * Creates a CSS class pattern strategy
   */
  static createCssClassStrategy(
    classPatterns: Record<string, string>,
    confidence = 0.8
  ): CustomStrategy {
    const mappingFunction: CustomMappingFunction = (
      formSchema,
      profileKeys,
      mappedIndices
    ) => {
      const mappings: FieldMapping[] = [];
      
      formSchema.fields.forEach((field: FormFieldSchema, index: number) => {
        if (mappedIndices.has(index)) return;
        
        const selector = field.selector.toLowerCase();
        
        for (const [classPattern, profileKey] of Object.entries(classPatterns)) {
          if (!profileKeys.includes(profileKey)) continue;
          
          if (selector.includes(classPattern.toLowerCase())) {
            mappings.push({
              formFieldIdx: index,
              profileKey,
              confidence,
              source: 'vendor' as const,
              action: field.elementType === 'select' ? 'selectByText' as const : 'setValue' as const,
              reasoning: `CSS class pattern match: ${classPattern}`
            });
            break;
          }
        }
      });
      
      return mappings;
    };
    
    return new CustomStrategy(
      {
        name: 'css-class-patterns',
        baseConfidence: confidence,
        params: { classPatterns }
      },
      mappingFunction
    );
  }
  
  /**
   * Creates a textarea analysis strategy
   */
  static createTextareaStrategy(
    textareaProfileKey = 'Cover Letter',
    confidence = 0.85
  ): CustomStrategy {
    const mappingFunction: CustomMappingFunction = (
      formSchema,
      profileKeys,
      mappedIndices
    ) => {
      const mappings: FieldMapping[] = [];
      
      if (!profileKeys.includes(textareaProfileKey)) {
        return mappings;
      }
      
      formSchema.fields.forEach((field: FormFieldSchema, index: number) => {
        if (mappedIndices.has(index)) return;
        
        if (field.elementType === 'textarea') {
          // Additional checks for cover letter indication
          const label = field.label.toLowerCase();
          const selector = field.selector.toLowerCase();
          
          const isCoverLetter = 
            label.includes('cover') ||
            label.includes('letter') ||
            selector.includes('cover') ||
            selector.includes('letter');
          
          if (isCoverLetter) {
            mappings.push({
              formFieldIdx: index,
              profileKey: textareaProfileKey,
              confidence,
              source: 'vendor' as const,
              action: 'setValue' as const,
              reasoning: 'Textarea detected as cover letter field'
            });
          }
        }
      });
      
      return mappings;
    };
    
    return new CustomStrategy(
      {
        name: 'textarea-analysis',
        baseConfidence: confidence,
        params: { textareaProfileKey }
      },
      mappingFunction
    );
  }
}