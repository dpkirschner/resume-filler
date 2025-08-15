/**
 * Extraction Manager - Smart Debounced Form Extraction
 * 
 * Manages form extraction with performance-optimized MutationObserver
 * that prevents "extraction storms" on dynamic SPAs by using intelligent
 * change detection and progressive timeouts.
 */

import { FormExtractor } from './form-extractor';
import { ExtractedFormSchema, ExtractorMessage } from '../../types';

export class ExtractionManager {
  private formExtractor: FormExtractor;
  private mutationObserver: MutationObserver | null = null;
  private debounceTimer: number | null = null;
  private maxDelayTimer: number | null = null;
  
  private readonly DEBOUNCE_DELAY = 300; // ms - recommended by research
  private readonly MAX_EXTRACTION_DELAY = 2000; // Force extraction after 2s
  private readonly MIN_EXTRACTION_INTERVAL = 1000; // Minimum time between extractions
  
  private lastExtractionTime = 0;
  private lastFormElementCount = 0;
  private isExtracting = false;

  constructor() {
    this.formExtractor = new FormExtractor();
    this.initializeMutationObserver();
  }

  /**
   * Initialize the performance-optimized MutationObserver
   */
  private initializeMutationObserver(): void {
    if (!window.MutationObserver) {
      console.warn('MutationObserver not supported');
      return;
    }

    this.mutationObserver = new MutationObserver((mutations) => {
      // Quick check to avoid processing irrelevant mutations
      if (this.shouldIgnoreMutations(mutations)) {
        return;
      }

      // Check if form elements actually changed
      // TODO: test performance of this before enabling it
      // if (this.hasFormElementsChanged()) {
      //   this.debouncedExtract();
      // }
    });

    // Start observing with optimized configuration
    this.startObserving();
  }

  /**
   * Start observing DOM changes
   */
  startObserving(): void {
    if (!this.mutationObserver) {
      return;
    }

    try {
      this.mutationObserver.observe(document.body, {
        childList: true,          // Watch for added/removed nodes
        subtree: true,            // Watch entire subtree
        attributes: false,        // Don't watch attribute changes (performance)
        characterData: false,     // Don't watch text changes (performance)
        attributeOldValue: false, // Don't store old values (memory)
        characterDataOldValue: false
      });

      console.debug('ExtractionManager: MutationObserver started');
    } catch (error) {
      console.error('Failed to start MutationObserver:', error);
    }
  }

  /**
   * Stop observing DOM changes
   */
  stopObserving(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      console.debug('ExtractionManager: MutationObserver stopped');
    }

    this.clearTimers();
  }

  /**
   * Force immediate extraction (for manual triggers)
   */
  async forceExtraction(): Promise<ExtractedFormSchema | null> {
    this.clearTimers();
    return this.performExtraction();
  }

  /**
   * Debounced extraction with progressive timeout
   */
  private debouncedExtract = (): void => {
    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set up new debounce timer
    this.debounceTimer = window.setTimeout(() => {
      this.performExtraction();
    }, this.DEBOUNCE_DELAY);

    // Set up max delay timer if not already set
    if (!this.maxDelayTimer) {
      this.maxDelayTimer = window.setTimeout(() => {
        console.debug('ExtractionManager: Forcing extraction due to max delay timeout');
        this.clearTimers();
        this.performExtraction();
      }, this.MAX_EXTRACTION_DELAY);
    }
  };

  /**
   * Perform the actual form extraction
   */
  private async performExtraction(): Promise<ExtractedFormSchema | null> {
    // Prevent concurrent extractions
    if (this.isExtracting) {
      console.debug('ExtractionManager: Extraction already in progress, skipping');
      return null;
    }

    // Check minimum interval
    const now = Date.now();
    if (now - this.lastExtractionTime < this.MIN_EXTRACTION_INTERVAL) {
      console.debug('ExtractionManager: Extraction too soon, skipping');
      return null;
    }

    this.clearTimers();
    this.isExtracting = true;
    this.lastExtractionTime = now;

    try {
      const schema = await this.formExtractor.extractFormSchema();

      // Update tracking
      this.lastFormElementCount = schema.fields.length;
      
      // Send to background script
      this.sendMessageToBackground({
        type: 'FORM_SCHEMA_EXTRACTED',
        payload: {
          ...schema,
          extractionSource: 'mutation-observer' as const
        }
      });

      console.debug(`ExtractionManager: Extracted ${schema.fields.length} form fields`);
      return schema;

    } catch (error) {
      console.error('ExtractionManager: Extraction failed:', error);
      
      this.sendMessageToBackground({
        type: 'EXTRACTION_ERROR',
        payload: {
          error: error instanceof Error ? error.message : 'Unknown error',
          details: { timestamp: now }
        }
      });

      return null;
    } finally {
      this.isExtracting = false;
    }
  }

  /**
   * Check if mutations should be ignored for performance
   */
  private shouldIgnoreMutations(mutations: MutationRecord[]): boolean {
    // Ignore if too many mutations (likely bulk operation)
    if (mutations.length > 100) {
      console.debug('ExtractionManager: Ignoring bulk mutations');
      return true;
    }

    // Quick scan for form-related changes
    let hasFormRelatedChanges = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        // Check added nodes for form elements
        for (const node of mutation.addedNodes) {
          if (this.containsFormElements(node)) {
            hasFormRelatedChanges = true;
            break;
          }
        }
        
        // Check removed nodes for form elements
        if (!hasFormRelatedChanges) {
          for (const node of mutation.removedNodes) {
            if (this.containsFormElements(node)) {
              hasFormRelatedChanges = true;
              break;
            }
          }
        }
      }
      
      if (hasFormRelatedChanges) break;
    }

    return !hasFormRelatedChanges;
  }

  /**
   * Check if a node contains form elements
   */
  private containsFormElements(node: Node): boolean {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    const element = node as Element;
    
    // Check if the node itself is a form element
    if (this.isFormElement(element)) {
      return true;
    }

    // Check if the node contains form elements
    return element.querySelector('input, select, textarea') !== null;
  }

  /**
   * Check if an element is a form element
   */
  private isFormElement(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'select' || tagName === 'textarea';
  }

  /**
   * Check if form elements have actually changed
   */
  private hasFormElementsChanged(): boolean {
    const query = 'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])';
    const currentFormCount = document.querySelectorAll(query).length;
    
    if (currentFormCount !== this.lastFormElementCount) {
      this.lastFormElementCount = currentFormCount;
      return true;
    }
    
    return false;
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    if (this.maxDelayTimer) {
      clearTimeout(this.maxDelayTimer);
      this.maxDelayTimer = null;
    }
  }

  /**
   * Send message to background script
   */
  private sendMessageToBackground(message: ExtractorMessage): void {
    try {
      chrome.runtime.sendMessage(message).catch((error) => {
        // Ignore errors if background script isn't ready
        console.debug('Failed to send message to background:', error);
      });
    } catch (error) {
      console.debug('Chrome runtime not available:', error);
    }
  }

  /**
   * Get extraction statistics
   */
  getStats(): {
    lastExtractionTime: number;
    lastFormElementCount: number;
    isObserving: boolean;
    isExtracting: boolean;
  } {
    return {
      lastExtractionTime: this.lastExtractionTime,
      lastFormElementCount: this.lastFormElementCount,
      isObserving: !!this.mutationObserver,
      isExtracting: this.isExtracting
    };
  }

  /**
   * Handle page visibility changes to optimize performance
   */
  handleVisibilityChange(): void {
    if (document.hidden) {
      // Page is hidden - stop observing to save resources
      this.stopObserving();
    } else {
      // Page is visible - resume observing
      this.startObserving();
      
      // Check for changes that might have occurred while hidden
      if (this.hasFormElementsChanged()) {
        this.debouncedExtract();
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopObserving();
    
    // Remove visibility change listener if added
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}