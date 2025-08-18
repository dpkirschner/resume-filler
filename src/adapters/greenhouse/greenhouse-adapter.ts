/**
 * Greenhouse ATS Adapter
 * Handles field mapping for Greenhouse job application forms
 * 
 * Key Greenhouse patterns (from test fixtures):
 * - Uses aria-label for field identification
 * - Class patterns: .form-field, .field-container  
 * - Name attributes with underscore format (first_name, last_name)
 * - Placeholder text often matches aria-label
 */

import { BaseAdapter } from '../base-adapter';
import { ExtractedFormSchema, MappingResult, FieldMapping } from '../../types';

export class GreenhouseAdapter extends BaseAdapter {
  // Centralized mapping configurations for maintainability
  private readonly ARIA_LABEL_MAPPINGS: Record<string, string> = {
    'first name': 'First Name',
    'last name': 'Last Name', 
    'email': 'Email',
    'email address': 'Email',
    'phone': 'Phone',
    'phone number': 'Phone',
    'cover letter': 'Cover Letter',
    'resume': 'Resume',
    'linkedin': 'LinkedIn',
    'portfolio': 'Portfolio',
    'website': 'Website'
  };

  private readonly NAME_MAPPINGS: Record<string, string> = {
    'first_name': 'First Name',
    'last_name': 'Last Name',
    'email': 'Email',
    'phone': 'Phone',
    'phone_number': 'Phone',
    'cover_letter': 'Cover Letter',
    'resume': 'Resume',
    'linkedin_url': 'LinkedIn',
    'website': 'Website',
    'portfolio': 'Portfolio'
  };

  constructor() {
    super(
      'Greenhouse',
      ['greenhouse.io', 'boards.greenhouse.io'],
      100 // High priority for Greenhouse domains
    );
  }

  async mapFields(
    formSchema: ExtractedFormSchema, 
    profileKeys: string[]
  ): Promise<MappingResult> {
    const startTime = Date.now();
    this.logger.debug(`Starting Greenhouse mapping for ${formSchema.fields.length} fields`);

    // Use waterfall mapping with Greenhouse-specific strategies
    const mappings = this.builder(formSchema, profileKeys)
      // Strategy 1: Map by aria-label (primary Greenhouse identifier) - O(1) lookup
      .matchByAttribute('aria-label', this.ARIA_LABEL_MAPPINGS, 0.95, 'exact')
      
      // Strategy 2: Map by name attribute patterns - O(1) lookup  
      .matchByAttribute('name', this.NAME_MAPPINGS, 0.9, 'exact')
      
      // Strategy 3: All custom Greenhouse logic (textareas, file uploads, URL fields)
      .addCustomMapping((schema, keys, mappedIndices) => this.mapGreenhouseSpecificFields(schema, keys, mappedIndices))
      
      // Optimize results (no generic label matching needed)
      .filterByConfidence(0.4)
      .sortByConfidence()
      .getMappings();

    const result = this.createMappingResult(mappings, formSchema, startTime);
    this.logMappingResult(result, formSchema);

    return result;
  }


  /**
   * Comprehensive Greenhouse-specific field mapping
   * Handles textareas, file uploads, URL fields, and CSS class patterns
   * Uses waterfall approach to avoid conflicts with higher-confidence mappings
   */
  private mapGreenhouseSpecificFields(
    formSchema: ExtractedFormSchema,
    profileKeys: string[],
    mappedIndices: Set<number>
  ): FieldMapping[] {
    const mappings: FieldMapping[] = [];

    for (let i = 0; i < formSchema.fields.length; i++) {
      // Skip fields already mapped by higher-confidence strategies
      if (mappedIndices.has(i)) {
        continue;
      }
      
      const field = formSchema.fields[i];
      
      // Strategy 1: Textarea fields for cover letters
      if (field.elementType === 'textarea' && profileKeys.includes('Cover Letter')) {
        // Greenhouse textareas with specific classes or names are usually cover letters
        if (field.selector.includes('.textarea-field') || 
            field.selector.includes('.form-field') ||
            field.attributes.name?.includes('cover') ||
            field.label.toLowerCase().includes('cover')) {
          
          mappings.push(this.createFieldMapping(
            i,
            'Cover Letter',
            0.85,
            'Greenhouse textarea detected as cover letter field',
            field
          ));
          continue;
        }
      }

      // Strategy 2: File input fields for resume uploads
      if (field.attributes.type === 'file' && profileKeys.includes('Resume')) {
        mappings.push(this.createFieldMapping(
          i,
          'Resume',
          0.9,
          'File input detected as resume upload',
          field
        ));
        continue;
      }

      // Strategy 3: URL fields for LinkedIn/Portfolio
      if (field.attributes.type === 'url') {
        const label = field.label.toLowerCase();
        if (label.includes('linkedin') && profileKeys.includes('LinkedIn')) {
          mappings.push(this.createFieldMapping(
            i,
            'LinkedIn',
            0.9,
            'URL field detected as LinkedIn profile',
            field
          ));
        } else if ((label.includes('portfolio') || label.includes('website')) && profileKeys.includes('Portfolio')) {
          mappings.push(this.createFieldMapping(
            i,
            'Portfolio',
            0.85,
            'URL field detected as portfolio/website',
            field
          ));
        }
      }
    }

    return mappings;
  }

  /**
   * Enhanced domain checking for Greenhouse
   * Focuses on unique patterns beyond standard domain matching
   */
  canHandle(url: string): boolean {
    // The base class check for standard domains is primary
    if (super.canHandle(url)) {
      return true;
    }
    
    // Add specific checks for custom domains that use Greenhouse
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Check for URL path patterns that indicate Greenhouse on custom domains
      if (urlObj.pathname.includes('/jobs/') && hostname.includes('greenhouse')) {
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }
}