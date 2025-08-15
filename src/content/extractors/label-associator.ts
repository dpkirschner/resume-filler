/**
 * Label Associator - Enhanced with Geometric Validation
 * 
 * Implements multi-strategy label detection with spatial proximity validation
 * to prevent false associations with distant headers or instructions.
 */

import { 
  LabelResult, 
  GeometricValidationConfig
} from '../../types';
import { GeometricValidator } from './geometric-validator';

export class LabelAssociator {
  private geometricValidator: GeometricValidator;
  private geometricConfig: GeometricValidationConfig;

  constructor(geometricConfig: GeometricValidationConfig) {
    this.geometricConfig = geometricConfig;
    this.geometricValidator = new GeometricValidator();
  }

  /**
   * Associate a label with a form element using multiple strategies
   * @param element Form element to find label for
   * @returns Label result with confidence score
   */
  async associateLabel(element: HTMLFormElement): Promise<LabelResult> {
    const strategies = [
      () => this.findByForAttribute(element),
      () => this.findByWrappingLabel(element),
      () => this.findByAriaLabel(element),
      () => this.findByAriaLabelledBy(element),
      () => this.findByPlaceholder(element),
      () => this.findByGeometricProximity(element),
      () => this.findByParentContext(element)
    ];

    const results: LabelResult[] = [];
    for (const strategy of strategies) {
      const result = strategy();
      // Check for a high-confidence "fast path" exit after each strategy
      if (result.confidence > 0.7) {
        return result;
      }
      results.push(result);
    }

    // If no fast-path match was found, select the best from the already-collected results
    return this.selectBestFallback(results);
  }

  /**
   * Find label by for attribute (highest confidence)
   * @param element Form element
   * @returns Label result
   */
  private findByForAttribute(element: HTMLFormElement): LabelResult {
    if (!element.id) {
      return { label: '', confidence: 0, source: 'for-attribute' };
    }

    const label = document.querySelector(`label[for="${element.id}"]`) as HTMLLabelElement;
    if (label && label.textContent) {
      return {
        label: label.textContent.trim(),
        confidence: 0.95,
        source: 'for-attribute',
        debug: `Found label with for="${element.id}"`
      };
    }

    return { label: '', confidence: 0, source: 'for-attribute' };
  }

  /**
   * Find label by wrapping label element
   * @param element Form element
   * @returns Label result
   */
  private findByWrappingLabel(element: HTMLFormElement): LabelResult {
    let parent = element.parentElement;
    let depth = 0;
    const maxDepth = 3; // Reasonable search depth

    while (parent && depth < maxDepth) {
      if (parent.tagName.toLowerCase() === 'label') {
        const labelText = this.extractLabelText(parent as HTMLLabelElement, element);
        if (labelText) {
          return {
            label: labelText,
            confidence: 0.9,
            source: 'wrapping-label',
            debug: `Found wrapping label at depth ${depth}`
          };
        }
      }
      parent = parent.parentElement;
      depth++;
    }

    return { label: '', confidence: 0, source: 'wrapping-label' };
  }

  /**
   * Find label by aria-label attribute
   * @param element Form element
   * @returns Label result
   */
  private findByAriaLabel(element: HTMLFormElement): LabelResult {
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) {
      return {
        label: ariaLabel.trim(),
        confidence: 0.85,
        source: 'aria-label',
        debug: 'Found aria-label attribute'
      };
    }

    return { label: '', confidence: 0, source: 'aria-label' };
  }

  /**
   * Find label by aria-labelledby attribute
   * @param element Form element
   * @returns Label result
   */
  private findByAriaLabelledBy(element: HTMLFormElement): LabelResult {
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (!ariaLabelledBy) {
      return { label: '', confidence: 0, source: 'aria-labelledby' };
    }

    const labelElement = document.getElementById(ariaLabelledBy);
    if (labelElement && labelElement.textContent) {
      return {
        label: labelElement.textContent.trim(),
        confidence: 0.85,
        source: 'aria-labelledby',
        debug: `Found element with id="${ariaLabelledBy}"`
      };
    }

    return { label: '', confidence: 0, source: 'aria-labelledby' };
  }

  /**
   * Find label by placeholder attribute (lower confidence)
   * @param element Form element
   * @returns Label result
   */
  private findByPlaceholder(element: HTMLFormElement): LabelResult {
    const placeholder = element.getAttribute('placeholder');
    if (placeholder && placeholder.trim()) {
      return {
        label: placeholder.trim(),
        confidence: 0.5, // Lower confidence as placeholders are less reliable
        source: 'placeholder',
        debug: 'Using placeholder as fallback label'
      };
    }

    return { label: '', confidence: 0, source: 'placeholder' };
  }

  /**
   * Find label by geometric proximity (enhanced with spatial validation)
   * @param element Form element
   * @returns Label result
   */
  private findByGeometricProximity(element: HTMLFormElement): LabelResult {
    const nearbyTextNodes = this.findNearbyTextNodes(element);

    for (const textNode of nearbyTextNodes) {
      const validation = this.geometricValidator.validateLabelProximity(
        element,
        textNode.element,
        this.geometricConfig
      );

      if (validation.isValid) {
        return {
          label: textNode.text,
          confidence: validation.confidence,
          source: 'geometric-proximity',
          debug: validation.reason
        };
      }
    }

    return { label: '', confidence: 0, source: 'geometric-proximity' };
  }

  /**
   * Find label by parent context (improved heuristic)
   * @param element Form element
   * @returns Label result
   */
  private findByParentContext(element: HTMLFormElement): LabelResult {
    let parent = element.parentElement;
    let depth = 0;
    const maxDepth = 5;

    while (parent && depth < maxDepth) {
      // Look for text content in parent containers
      const textContent = this.extractContainerText(parent, element);
      if (textContent) {
        // Apply geometric validation even for parent context
        const validation = this.geometricValidator.validateLabelProximity(
          element,
          parent,
          this.geometricConfig
        );

        if (validation.isValid) {
          return {
            label: textContent,
            confidence: Math.max(0.3, validation.confidence * 0.6), // Reduced confidence for heuristic
            source: 'fallback',
            debug: `Found parent context at depth ${depth}: ${validation.reason}`
          };
        }
      }

      parent = parent.parentElement;
      depth++;
    }

    return { label: '', confidence: 0, source: 'fallback' };
  }

  /**
   * Find nearby text nodes for geometric validation
   * @param element Form element
   * @returns Array of nearby text nodes with their text content
   */
  private findNearbyTextNodes(element: HTMLFormElement): Array<{ element: HTMLElement; text: string }> {
    const results: Array<{ element: HTMLElement; text: string }> = [];
    
    // Find a reasonable search root instead of document.body
    let searchRoot: Node = document.body;
    let parent = element.parentElement;
    let depth = 0;
    // Walk up a few levels to find a reasonable container to search within
    while (parent && depth < 5) {
      if (parent.tagName.toLowerCase() === 'form' || parent.clientHeight > 200) {
        searchRoot = parent;
        break;
      }
      parent = parent.parentElement;
      depth++;
    }

    const walker = document.createTreeWalker(
      searchRoot,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip if text is empty or whitespace only
          if (!node.textContent || !node.textContent.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip if parent is the form element itself
          if (node.parentElement === element) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      const textContent = node.textContent?.trim();
      if (textContent && textContent.length > 1 && textContent.length < 100) {
        // Only consider reasonable length text
        results.push({
          element: node.parentElement as HTMLElement,
          text: textContent
        });
      }
    }

    // Sort by proximity to the form element
    const elementRect = element.getBoundingClientRect();

    // First, map each result to an object with its pre-calculated distance
    const resultsWithDistance = results.map(res => {
      const resRect = res.element.getBoundingClientRect();
      const distance = this.calculateDistance(elementRect, resRect);
      return { ...res, distance };
    });

    // Then, sort the new array based on the pre-calculated distance
    resultsWithDistance.sort((a, b) => a.distance - b.distance);

    // Return the top 10 closest text nodes, removing the temporary distance property
    return resultsWithDistance.slice(0, 10).map(({ distance: _distance, ...res }) => res);
  }

  /**
   * Calculate distance between two rectangles
   * @param rect1 First rectangle
   * @param rect2 Second rectangle
   * @returns Distance in pixels
   */
  private calculateDistance(rect1: DOMRect, rect2: DOMRect): number {
    const centerX1 = rect1.x + rect1.width / 2;
    const centerY1 = rect1.y + rect1.height / 2;
    const centerX2 = rect2.x + rect2.width / 2;
    const centerY2 = rect2.y + rect2.height / 2;
    
    return Math.sqrt(Math.pow(centerX2 - centerX1, 2) + Math.pow(centerY2 - centerY1, 2));
  }

  /**
   * Extract label text from a label element, excluding the form element itself
   * @param label Label element
   * @param formElement Form element to exclude
   * @returns Extracted text or empty string
   */
  private extractLabelText(label: HTMLLabelElement, _formElement: HTMLFormElement): string {
    const clone = label.cloneNode(true) as HTMLLabelElement;
    
    // Remove the form element from the clone
    const formElements = clone.querySelectorAll('input, select, textarea');
    formElements.forEach(el => el.remove());
    
    return clone.textContent?.trim() || '';
  }

  /**
   * Extract meaningful text from a container element
   * @param container Container element
   * @param formElement Form element to exclude
   * @returns Extracted text or empty string
   */
  private extractContainerText(container: HTMLElement, _formElement: HTMLFormElement): string {
    const clone = container.cloneNode(true) as HTMLElement;
    
    // Remove nested form elements
    const formElements = clone.querySelectorAll('input, select, textarea');
    formElements.forEach(el => el.remove());
    
    const text = clone.textContent?.trim() || '';
    
    // Filter out very long text or very short text
    if (text.length < 2 || text.length > 50) {
      return '';
    }
    
    // Filter out text that looks like code or IDs
    if (/^[a-f0-9-]{8,}$/i.test(text) || /^\d+$/.test(text)) {
      return '';
    }
    
    return text;
  }

  /**
   * Select the best fallback from multiple label results
   * @param results Array of label results
   * @returns Best result
   */
  private selectBestFallback(results: LabelResult[]): LabelResult {
    // Sort by confidence descending
    const sorted = results.filter(r => r.confidence > 0).sort((a, b) => b.confidence - a.confidence);
    
    if (sorted.length > 0) {
      return sorted[0];
    }
    
    // Ultimate fallback
    return {
      label: 'Unlabeled Field',
      confidence: 0.1,
      source: 'fallback',
      debug: 'No suitable label found'
    };
  }
}