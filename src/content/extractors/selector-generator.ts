/**
 * Selector Generator - Advanced CSS Selector Generation
 * 
 * Implements hybrid approach combining manual high-confidence selectors
 * with css-selector-generator library for complex cases.
 * Includes blacklisting of auto-generated framework classes.
 */

import { SelectorCandidate, SelectorResult, ManualSource } from '../../types';
import { Logger } from '../../utils';

const logger = new Logger('SelectorGenerator');

type StrategyConfig = {
  attr: string;
  confidence: number;
  validator?: (value: string) => boolean;
  sourceKey: string; // Maps to ManualStrategyAttribute values
};

// Import the CSS selector generator library
type CssSelectorFunction = (element: Element, options?: Record<string, unknown>) => string;

let loadingPromise: Promise<CssSelectorFunction | null> | null = null;
let getCssSelector: CssSelectorFunction | null = null;

// Race-condition-free dynamic import
async function loadCssSelectorGenerator() {
  if (getCssSelector) {
    return getCssSelector;
  }

  if (!loadingPromise) {
    loadingPromise = import('css-selector-generator')
      .then(module => {
        const moduleAny = module as Record<string, unknown>;
        getCssSelector = (moduleAny.getCssSelector || 
                         (moduleAny.default as Record<string, unknown>)?.getCssSelector || 
                         moduleAny.default) as CssSelectorFunction;
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
  
    // Define strategies in order of descending priority.
    const strategies: StrategyConfig[] = [
      { attr: 'data-testid', confidence: 0.99, sourceKey: 'testid' },
      { attr: 'data-cy', confidence: 0.98, sourceKey: 'cy' },
      { attr: 'data-test', confidence: 0.97, sourceKey: 'test' },
      { attr: 'data-automation-id', confidence: 0.95, sourceKey: 'automation-id' },
      { attr: 'id', confidence: 0.90, validator: this.isStableId, sourceKey: 'id' },
      { attr: 'name', confidence: 0.85, sourceKey: 'name' },
      { attr: 'autocomplete', confidence: 0.80, sourceKey: 'autocomplete' },
    ];
  
    for (const strategy of strategies) {
      const value = element.getAttribute(strategy.attr);
  
      if (value && (!strategy.validator || strategy.validator(value))) {
        let selector = '';
  
        // The ID attribute is a special case that uses the '#' syntax.
        if (strategy.attr === 'id') {
          const escapedId = value.replace(/([:./\\])/g, '\\$1');
          selector = `#${escapedId}`;
        } else {
          selector = `[${strategy.attr}="${value}"]`;
        }
  
        // Add a candidate with the tag name for higher specificity and confidence.
        candidates.push({
          selector: `${element.tagName.toLowerCase()}${selector}`,
          confidence: strategy.confidence + 0.01,
          source: `manual-${strategy.sourceKey}-tag` as ManualSource,
        });
  
        // Add the simpler candidate as a fallback.
        candidates.push({
          selector,
          confidence: strategy.confidence,
          source: `manual-${strategy.sourceKey}` as ManualSource,
        });
      }
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
    if (!targetElement.isConnected) {
      return candidates.filter(c => c.confidence > 0.1);
    }
  
    const validated: SelectorCandidate[] = [];

    for (const candidate of candidates) {
      try {
        const elements = document.querySelectorAll(candidate.selector);
        
        // Check if selector uniquely identifies the target element
        if (elements.length === 1 && elements[0] === targetElement) {
          // Perfect match - apply a nuanced confidence boost.
          let confidenceBoost = 0;
          if (candidate.source.startsWith('manual')) {
            confidenceBoost = 0.1; // Give a significant boost to reliable manual selectors.
          } else {
            confidenceBoost = 0.05; // Give a smaller boost to library/structural selectors.
          }
          
          const newConfidence = Math.min(1, candidate.confidence + confidenceBoost);
          validated.push({
            ...candidate,
            // Round the result to a fixed precision to avoid floating-point errors.
            confidence: parseFloat(newConfidence.toFixed(4))
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
        logger.debug(`Invalid selector "${candidate.selector}":`, error);
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
      } catch {
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