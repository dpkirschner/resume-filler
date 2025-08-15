/**
 * Selector Generator - Advanced CSS Selector Generation
 * 
 * Implements hybrid approach combining manual high-confidence selectors
 * with css-selector-generator library for complex cases.
 * Includes blacklisting of auto-generated framework classes.
 */

import { SelectorCandidate, SelectorResult } from '../../types';

// Import the CSS selector generator library
let loadingPromise: Promise<any> | null = null;
let getCssSelector: any = null;

// Race-condition-free dynamic import
async function loadCssSelectorGenerator() {
  if (getCssSelector) {
    return getCssSelector;
  }

  if (!loadingPromise) {
    loadingPromise = import('css-selector-generator')
      .then(module => {
        getCssSelector = (module as any).getCssSelector || (module as any).default?.getCssSelector || (module as any).default;
        return getCssSelector;
      })
      .catch(error => {
        console.warn('Failed to load css-selector-generator:', error);
        loadingPromise = null; // Allow retrying on failure
        return null;
      });
  }
  
  return loadingPromise;
}

export class SelectorGenerator {
  private readonly AUTO_GENERATED_CLASS_PATTERNS = [
    /^css-/,           // CSS modules
    /^r-\d+/,          // React auto-generated
    /^_\w+/,           // Webpack/build tool generated
    /^\w{6,8}$/,       // Short random strings
    /^[a-f0-9]{8,}$/i, // Hash-like strings
  ];

  private readonly STABLE_ATTRIBUTE_SELECTORS = [
    '[data-testid]',
    '[data-test]',
    '[data-cy]',
    '[name]',
    '[id]',
    '[autocomplete]'
  ];

  /**
   * Generate optimal CSS selector with fallbacks
   * @param element Element to generate selector for
   * @returns Selector result with primary and fallback selectors
   */
  async generateOptimalSelector(element: HTMLElement): Promise<SelectorResult> {
    const candidates: SelectorCandidate[] = [];

    // Strategy 1: High-confidence manual selectors
    candidates.push(...this.generateManualSelectors(element));

    // Strategy 2: CSS selector library (with timeout and error handling)
    const libraryCandidates = await this.generateLibrarySelectors(element);
    candidates.push(...libraryCandidates);

    // Strategy 3: Manual structural fallbacks
    candidates.push(...this.generateStructuralSelectors(element));

    // Validate and score all selectors
    const validatedCandidates = await this.validateSelectors(candidates, element);
    
    return this.selectBestSelectors(validatedCandidates);
  }

  /**
   * Generate high-confidence manual selectors
   * @param element Target element
   * @returns Array of selector candidates
   */
  private generateManualSelectors(element: HTMLElement): SelectorCandidate[] {
    const candidates: SelectorCandidate[] = [];

    // Strategy 1A: Unique ID selector
    if (element.id && this.isStableId(element.id)) {
      candidates.push({
        selector: `#${element.id}`,
        confidence: 0.95,
        source: 'manual-id'
      });
    }

    // Strategy 1B: Name attribute selector
    const name = element.getAttribute('name');
    if (name) {
      candidates.push({
        selector: `[name="${name}"]`,
        confidence: 0.9,
        source: 'manual-name'
      });

      // Enhanced name selector with context
      const form = element.closest('form');
      if (form) {
        candidates.push({
          selector: `form [name="${name}"]`,
          confidence: 0.92,
          source: 'manual-name'
        });
      }
    }

    // Strategy 1C: Data attribute selectors
    for (const attr of ['data-testid', 'data-test', 'data-cy']) {
      const value = element.getAttribute(attr);
      if (value) {
        candidates.push({
          selector: `[${attr}="${value}"]`,
          confidence: 0.88,
          source: 'manual-data-attr'
        });
      }
    }

    // Strategy 1D: Autocomplete attribute (form-specific)
    const autocomplete = element.getAttribute('autocomplete');
    if (autocomplete && autocomplete !== 'off') {
      candidates.push({
        selector: `[autocomplete="${autocomplete}"]`,
        confidence: 0.85,
        source: 'manual-data-attr'
      });
    }

    return candidates;
  }

  /**
   * Generate selectors using css-selector-generator library
   * @param element Target element
   * @returns Array of selector candidates
   */
  private async generateLibrarySelectors(element: HTMLElement): Promise<SelectorCandidate[]> {
    const candidates: SelectorCandidate[] = [];

    try {
      const cssSelectorGenerator = await loadCssSelectorGenerator();
      
      if (!cssSelectorGenerator) {
        return candidates;
      }

      // Generate selector with timeout protection
      const librarySelector = await this.withTimeout(
        () => cssSelectorGenerator(element, {
          // Blacklist auto-generated classes
          blacklist: (el: HTMLElement) => {
            const classes = Array.from(el.classList || []);
            return classes.some(cls => 
              this.AUTO_GENERATED_CLASS_PATTERNS.some(pattern => pattern.test(cls))
            );
          },
          // Whitelist stable attributes
          whitelist: this.STABLE_ATTRIBUTE_SELECTORS,
          // Prefer shorter selectors
          maxCandidates: 5,
          maxCombinations: 50
        }),
        1000 // 1 second timeout
      );

      if (librarySelector) {
        candidates.push({
          selector: librarySelector,
          confidence: 0.8,
          source: 'library'
        });
      }

    } catch (error) {
      console.debug('CSS selector library generation failed:', error);
    }

    return candidates;
  }

  /**
   * Generate structural selectors as fallbacks
   * @param element Target element
   * @returns Array of selector candidates
   */
  private generateStructuralSelectors(element: HTMLElement): SelectorCandidate[] {
    const candidates: SelectorCandidate[] = [];

    // Strategy 3A: Tag + type combination
    const tagName = element.tagName.toLowerCase();
    const type = element.getAttribute('type');
    
    if (type) {
      candidates.push({
        selector: `${tagName}[type="${type}"]`,
        confidence: 0.4,
        source: 'structural'
      });
    }

    // Strategy 3B: nth-of-type selector (more resilient to DOM changes)
    const parent = element.parentElement;
    if (parent) {
      const siblingsOfType = Array.from(parent.children).filter(
        child => child.tagName === element.tagName
      );
      const index = siblingsOfType.indexOf(element) + 1;
      
      candidates.push({
        selector: `${parent.tagName.toLowerCase()} > ${tagName}:nth-of-type(${index})`,
        confidence: 0.3,
        source: 'structural'
      });
    }

    // Strategy 3C: Form-specific structural selector
    const form = element.closest('form');
    if (form) {
      const formInputs = Array.from(form.querySelectorAll('input, select, textarea'));
      const formIndex = formInputs.indexOf(element) + 1;
      
      candidates.push({
        selector: `form ${tagName}:nth-of-type(${formIndex})`,
        confidence: 0.35,
        source: 'structural'
      });
    }

    return candidates;
  }

  /**
   * Validate selectors by testing them against the DOM
   * @param candidates Selector candidates to validate
   * @param targetElement The target element
   * @returns Validated candidates with updated confidence
   */
  private async validateSelectors(
    candidates: SelectorCandidate[],
    targetElement: HTMLElement
  ): Promise<SelectorCandidate[]> {
    const validated: SelectorCandidate[] = [];

    for (const candidate of candidates) {
      try {
        const elements = document.querySelectorAll(candidate.selector);
        
        // Check if selector uniquely identifies the target element
        if (elements.length === 1 && elements[0] === targetElement) {
          // Perfect match - boost confidence
          validated.push({
            ...candidate,
            confidence: Math.min(1, candidate.confidence + 0.1)
          });
        } else if (elements.length > 1 && Array.from(elements).includes(targetElement)) {
          // Non-unique but includes target - apply a harsh penalty and a cap
          validated.push({
            ...candidate,
            confidence: Math.min(0.4, candidate.confidence * 0.5)
          });
        } else if (elements.length === 0) {
          // Selector doesn't work - very low confidence
          validated.push({
            ...candidate,
            confidence: 0.1
          });
        }
        // Skip selectors that match wrong elements
        
      } catch (error) {
        // Invalid selector - skip
        console.debug(`Invalid selector "${candidate.selector}":`, error);
      }
    }

    return validated;
  }

  /**
   * Select the best selectors for primary and fallbacks
   * @param candidates Validated selector candidates
   * @returns Selector result
   */
  private selectBestSelectors(candidates: SelectorCandidate[]): SelectorResult {
    // Sort by confidence descending
    const sorted = candidates
      .filter(c => c.confidence > 0.1)
      .sort((a, b) => b.confidence - a.confidence);

    if (sorted.length === 0) {
      // Ultimate fallback
      return {
        primary: 'input, select, textarea',
        fallbacks: [],
        confidence: 0.1
      };
    }

    const primary = sorted[0].selector;
    const fallbacks = sorted.slice(1, 4).map(c => c.selector); // Top 3 fallbacks
    
    return {
      primary,
      fallbacks,
      confidence: sorted[0].confidence
    };
  }

  /**
   * Check if an ID is stable (not auto-generated)
   * @param id Element ID
   * @returns True if ID appears stable
   */
  private isStableId(id: string): boolean {
    // Filter out obviously auto-generated IDs
    const autoGeneratedPatterns = [
      /^[a-f0-9]{8,}$/i, // Hash-like
      /^\d+$/,           // Pure numbers
      /^react-/,         // React auto-generated
      /^mui-/,           // Material-UI auto-generated
      /^:r\w+:/,         // React dev tools format
    ];

    return !autoGeneratedPatterns.some(pattern => pattern.test(id));
  }

  /**
   * Execute function with timeout
   * @param fn Function to execute
   * @param timeoutMs Timeout in milliseconds
   * @returns Function result or null if timeout
   */
  private async withTimeout<T>(fn: () => T, timeoutMs: number): Promise<T | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, timeoutMs);

      try {
        const result = fn();
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        resolve(null);
      }
    });
  }

  /**
   * Generate a simple fallback selector for any form element
   * @param element Target element
   * @returns Basic selector
   */
  generateFallbackSelector(element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase();
    const type = element.getAttribute('type');
    
    if (type) {
      return `${tagName}[type="${type}"]`;
    }
    
    return tagName;
  }
}