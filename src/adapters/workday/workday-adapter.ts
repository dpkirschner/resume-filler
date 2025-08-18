/**
 * Workday ATS Adapter
 * Handles field mapping for Workday job application forms
 * 
 * Key Workday patterns (from test fixtures):
 * - Uses data-automation-id for field identification
 * - Nested structure: .wd-container > .wd-field-group > .wd-field-wrapper
 * - Label pattern: .wd-label adjacent to .wd-input/.wd-select
 * - Complex hierarchical DOM structure
 */

import { BaseAdapter } from '../base-adapter';
import { ExtractedFormSchema, MappingResult, FieldMapping } from '../../types';

export class WorkdayAdapter extends BaseAdapter {
  // Centralized mapping configurations for maintainability
  private readonly AUTOMATION_ID_MAPPINGS: Record<string, string> = {
    'firstName': 'First Name',
    'lastname': 'Last Name',
    'email': 'Email',
    'emailaddress': 'Email', 
    'phone': 'Phone',
    'phonenumber': 'Phone',
    'address': 'Address',
    'streetaddress': 'Address',
    'city': 'City',
    'state': 'State',
    'country': 'Country',
    'zipcode': 'Zip Code',
    'postalcode': 'Zip Code',
    'location': 'Current Location',
    'currentlocation': 'Current Location',
    'workauthorization': 'Work Authorization',
    'jobtitle': 'Current Job Title',
    'company': 'Current Company',
    'salary': 'Current Salary',
    'desiredsalary': 'Desired Salary',
    'startdate': 'Available Start Date',
    'availabilitydate': 'Available Start Date'
  };

  private readonly NAME_MAPPINGS: Record<string, string> = {
    'fname': 'First Name',
    'lname': 'Last Name', 
    'email': 'Email',
    'phone': 'Phone',
    'address1': 'Address',
    'city': 'City',
    'state': 'State',
    'zip': 'Zip Code',
    'country': 'Country'
  };

  // Enhanced label patterns specific to Workday's terminology
  private readonly WORKDAY_LABEL_PATTERNS = [
    { patterns: ['given name', 'first name'], profileKey: 'First Name' },
    { patterns: ['family name', 'last name', 'surname'], profileKey: 'Last Name' },
    { patterns: ['email address', 'contact email'], profileKey: 'Email' },
    { patterns: ['telephone', 'phone number', 'mobile'], profileKey: 'Phone' },
    { patterns: ['street address', 'address line'], profileKey: 'Address' },
    { patterns: ['current location', 'work location'], profileKey: 'Current Location' },
    { patterns: ['postal code', 'zip code'], profileKey: 'Zip Code' }
  ];

  // Workday tenant domain patterns for enhanced URL detection
  private readonly TENANT_PATTERNS = [
    /\.myworkday\.com$/,
    /\w+-\w+\.workday\.com$/
  ];

  constructor() {
    super(
      'Workday',
      ['workday.com', 'myworkday.com'],
      100 // High priority for Workday domains
    );
  }

  async mapFields(
    formSchema: ExtractedFormSchema, 
    profileKeys: string[]
  ): Promise<MappingResult> {
    const startTime = Date.now();
    this.logger.debug(`Starting Workday mapping for ${formSchema.fields.length} fields`);

    // Use waterfall mapping with Workday-specific strategies
    const mappings = this.builder(formSchema, profileKeys)
      // Strategy 1: Map by data-automation-id (Workday's primary identifier) - O(1) lookup
      .matchByAttribute('data-automation-id', this.AUTOMATION_ID_MAPPINGS, 0.98, 'contains')
      
      // Strategy 2: Map by input name attributes - O(1) lookup  
      .matchByAttribute('name', this.NAME_MAPPINGS, 0.85, 'contains')
      
      // Strategy 3: All custom Workday logic (CSS classes, dropdowns, enhanced labels)
      .addCustomMapping((schema, keys, mappedIndices) => this.mapWorkdaySpecificFields(schema, keys, mappedIndices))
      
      // Filter and optimize results (no generic label matching needed)
      .filterByConfidence(0.3)
      .sortByConfidence()
      .getMappings();

    const result = this.createMappingResult(mappings, formSchema, startTime);
    this.logMappingResult(result, formSchema);

    return result;
  }


  /**
   * Comprehensive Workday-specific field mapping
   * Handles CSS classes, dropdown options, file uploads, and enhanced label matching
   * Uses waterfall approach to avoid conflicts with higher-confidence mappings
   */
  private mapWorkdaySpecificFields(
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
      
      // Strategy 1: Check for Workday-specific CSS classes
      if (field.selector.includes('.wd-input') || field.selector.includes('.wd-select')) {
        
        // File upload detection (typically resumes)
        if (field.attributes.type === 'file' && profileKeys.includes('Resume')) {
          mappings.push(this.createFieldMapping(
            i,
            'Resume',
            0.9,
            'Workday file input detected as resume upload',
            field
          ));
          continue;
        }
        
        // Location dropdown detection
        if (field.elementType === 'select' && field.options) {
          const hasLocationOptions = field.options.some(opt => 
            opt.text.toLowerCase().includes('united states') ||
            opt.text.toLowerCase().includes('canada') ||
            opt.text.toLowerCase().includes('location')
          );
          
          if (hasLocationOptions && profileKeys.includes('Current Location')) {
            mappings.push(this.createFieldMapping(
              i,
              'Current Location',
              0.85,
              'Workday select with location options detected',
              field
            ));
            continue;
          }
        }
      }

      // Strategy 2: Enhanced label pattern matching for Workday
      const normalizedLabel = field.label.toLowerCase().trim();
      
      for (const { patterns, profileKey } of this.WORKDAY_LABEL_PATTERNS) {
        if (profileKeys.includes(profileKey) && patterns.some(pattern => normalizedLabel.includes(pattern))) {
          mappings.push(this.createFieldMapping(
            i,
            profileKey,
            0.8,
            `Workday enhanced label match: "${field.label}" -> ${profileKey}`,
            field
          ));
          break;
        }
      }
    }

    return mappings;
  }

  /**
   * Enhanced domain checking for Workday
   * Focuses on tenant patterns and unique URL indicators
   */
  canHandle(url: string): boolean {
    // The base class check for standard domains is primary
    if (super.canHandle(url)) {
      return true;
    }
    
    // Add specific checks for Workday tenant domains and custom implementations
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Check for Workday tenant patterns using centralized constants
      if (this.TENANT_PATTERNS.some(pattern => pattern.test(hostname))) {
        return true;
      }
      
      // Check for Workday-specific URL paths on domains that contain 'workday'
      if (hostname.includes('workday')) {
        const workdayPaths = ['/jobs/', '/requisition/', '/career'];
        if (workdayPaths.some(path => urlObj.pathname.includes(path))) {
          return true;
        }
      }
      
      return false;
    } catch {
      return false;
    }
  }
}