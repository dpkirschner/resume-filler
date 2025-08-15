/**
 * Form Schema Extractor
 * 
 * Stateless service for extracting form field schemas from web pages.
 * Discovers form elements, associates labels, generates selectors, and builds
 * structured schemas with confidence scoring. Includes geometric validation
 * for spatial label-field relationships and element visibility detection.
 */

import {
  FormFieldSchema,
  ExtractedFormSchema,
  FormFieldAttributes,
  SelectOption,
  GeometricValidationConfig
} from '../../types';
import { LabelAssociator } from './label-associator';
import { SelectorGenerator } from './selector-generator';
import { GeometricValidator } from './geometric-validator';

export class FormExtractor {
  private labelAssociator: LabelAssociator;
  private selectorGenerator: SelectorGenerator;
  private geometricValidator: GeometricValidator;
  private geometricConfig: GeometricValidationConfig;

  constructor() {
    this.geometricConfig = {
      maxVerticalDistance: 50,
      maxHorizontalDistance: 200,
      sameRowTolerance: 10
    };

    this.labelAssociator = new LabelAssociator(this.geometricConfig);
    this.selectorGenerator = new SelectorGenerator();
    this.geometricValidator = new GeometricValidator();
  }

  /**
   * Main entry point for form extraction
   * @returns Extracted form schema
   */
  async extractFormSchema(): Promise<ExtractedFormSchema> {
    try {
      const startTime = performance.now();
      
      // Find all form elements
      const formElements = this.findFormElements();
      
      if (formElements.length === 0) {
        return {
          fields: [],
          url: window.location.href,
          timestamp: Date.now(),
          extractionSource: 'manual'
        };
      }

      // Process each element
      const fields: FormFieldSchema[] = [];
      
      for (let i = 0; i < formElements.length; i++) {
        const element = formElements[i];
        
        try {
          const fieldSchema = await this.processFormElement(element, i);
          if (fieldSchema) {
            fields.push(fieldSchema);
          }
        } catch (error) {
          console.warn(`Failed to process form element at index ${i}:`, error);
          // Continue processing other elements
        }
      }

      const endTime = performance.now();
      console.debug(`Form extraction completed in ${endTime - startTime}ms. Found ${fields.length} fields.`);

      return {
        fields,
        url: window.location.href,
        timestamp: Date.now(),
        extractionSource: 'manual'
      };

    } catch (error) {
      console.error('Form extraction failed:', error);
      throw new Error(`Form extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find all relevant form elements on the page
   * @returns Array of form elements
   */
  private findFormElements(): HTMLFormElement[] {
    // Query for form elements, excluding hidden and disabled ones
    const query = 'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])';
    const elements = document.querySelectorAll(query);
    const visibleElements: HTMLFormElement[] = [];

    for (const element of elements) {
      if (this.isElementVisible(element as HTMLElement)) {
        visibleElements.push(element as HTMLFormElement);
      }
    }

    return visibleElements;
  }

  /**
   * Check if an element is visible
   * @param element Element to check
   * @returns True if visible
   */
  private isElementVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
      return false;
    }
    
    // Use the geometric validator to check actual dimensions
    return this.geometricValidator.hasValidDimensions(element);
  }

  /**
   * Process a single form element
   * @param element Form element to process
   * @param index Element index
   * @returns Field schema or null
   */
  private async processFormElement(element: HTMLFormElement, index: number): Promise<FormFieldSchema | null> {
    // Extract basic attributes
    const attributes = this.extractAttributes(element);
    
    // Associate label
    const labelResult = await this.labelAssociator.associateLabel(element);
    
    // Generate selectors
    const selectorResult = await this.selectorGenerator.generateOptimalSelector(element);
    
    // Extract options for select elements
    const options = this.extractOptions(element);
    
    // Get bounding rect for debugging
    const boundingRect = element.getBoundingClientRect();

    return {
      idx: index,
      label: labelResult.label,
      labelSource: labelResult.source,
      labelConfidence: labelResult.confidence,
      selector: selectorResult.primary,
      fallbackSelectors: selectorResult.fallbacks,
      elementType: element.tagName.toLowerCase() as 'input' | 'select' | 'textarea',
      attributes,
      options,
      boundingRect: {
        x: boundingRect.x,
        y: boundingRect.y,
        width: boundingRect.width,
        height: boundingRect.height,
        top: boundingRect.top,
        right: boundingRect.right,
        bottom: boundingRect.bottom,
        left: boundingRect.left
      } as DOMRect
    };
  }

  /**
   * Extract form field attributes
   * @param element Form element
   * @returns Extracted attributes
   */
  private extractAttributes(element: HTMLFormElement): FormFieldAttributes {
    return {
      name: element.getAttribute('name') || undefined,
      id: element.id || undefined,
      type: element.getAttribute('type') || undefined,
      placeholder: element.getAttribute('placeholder') || undefined,
      required: element.hasAttribute('required'),
      autocomplete: element.getAttribute('autocomplete') || undefined,
      'aria-label': element.getAttribute('aria-label') || undefined,
      'aria-labelledby': element.getAttribute('aria-labelledby') || undefined
    };
  }

  /**
   * Extract options from select elements
   * @param element Form element
   * @returns Options array or null
   */
  private extractOptions(element: HTMLFormElement): SelectOption[] | null {
    if (element.tagName.toLowerCase() !== 'select') {
      return null;
    }

    const selectElement = element as unknown as HTMLSelectElement;
    const options: SelectOption[] = [];

    for (const option of selectElement.options) {
      options.push({
        value: option.value,
        text: option.textContent || option.innerText || ''
      });
    }

    return options.length > 0 ? options : null;
  }

}