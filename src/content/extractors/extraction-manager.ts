/**
 * Extraction Manager - Smart Debounced Form Extraction
 * * Manages form extraction with performance-optimized MutationObserver
 * that prevents "extraction storms" on dynamic SPAs by using intelligent
 * change detection and progressive timeouts.
 */

import { FormExtractor } from './form-extractor';
import { ExtractedFormSchema, ExtractorMessage } from '../../types';
import { Logger } from '../../utils';

const logger = new Logger('extraction-manager');

export class ExtractionManager {
  private formExtractor: FormExtractor;
  private mutationObserver: MutationObserver | null = null;
  private debounceTimer: number | null = null;
  private maxDelayTimer: number | null = null;
  
  private readonly DEBOUNCE_DELAY = 300;
  private readonly MAX_EXTRACTION_DELAY = 2000;
  private readonly MIN_EXTRACTION_INTERVAL = 1000;
  
  private lastExtractionTime = 0;
  private isExtracting = false;
  private isObserving = false;

  constructor() {
    this.formExtractor = new FormExtractor();
    this.initializeMutationObserver();
  }

  private initializeMutationObserver(): void {
    if (!window.MutationObserver) {
      logger.warn('MutationObserver not supported');
      return;
    }

    this.mutationObserver = new MutationObserver((mutations) => {
      if (this.shouldIgnoreMutations(mutations)) {
        return;
      }
      
      this.debouncedExtract();
    });

    this.startObserving();
  }

  startObserving(): void {
    if (!this.mutationObserver) {
      return;
    }
    try {
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false,
      });
      this.isObserving = true;
      logger.debug('ExtractionManager: MutationObserver started');
    } catch (error) {
      logger.error('Failed to start MutationObserver:', error);
    }
  }

  stopObserving(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.isObserving = false;
      logger.debug('ExtractionManager: MutationObserver stopped');
    }
    this.clearTimers();
  }

  async forceExtraction(): Promise<ExtractedFormSchema | null> {
    this.clearTimers();
    return this.performExtraction();
  }

  private debouncedExtract = (): void => {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      this.performExtraction();
    }, this.DEBOUNCE_DELAY);

    if (!this.maxDelayTimer) {
      this.maxDelayTimer = window.setTimeout(() => {
        logger.debug('ExtractionManager: Forcing extraction due to max delay timeout');
        this.clearTimers();
        this.performExtraction();
      }, this.MAX_EXTRACTION_DELAY);
    }
  };

  private async performExtraction(): Promise<ExtractedFormSchema | null> {
    if (this.isExtracting) {
      return null;
    }
    const now = Date.now();
    if (now - this.lastExtractionTime < this.MIN_EXTRACTION_INTERVAL) {
      return null;
    }

    this.clearTimers();
    this.isExtracting = true;
    this.lastExtractionTime = now;

    try {
      const schema = await this.formExtractor.extractFormSchema();
      this.sendMessageToBackground({
        type: 'FORM_SCHEMA_EXTRACTED',
        payload: { ...schema, extractionSource: 'mutation-observer' as const }
      });
      return schema;
    } catch (error) {
      logger.error('ExtractionManager: Extraction failed:', error);
      this.sendMessageToBackground({
        type: 'EXTRACTION_ERROR',
        payload: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
      return null;
    } finally {
      this.isExtracting = false;
    }
  }

  private shouldIgnoreMutations(mutations: MutationRecord[]): boolean {
    if (mutations.length > 100) {
      return true;
    }
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (this.containsFormElements(node)) return false;
        }
        for (const node of mutation.removedNodes) {
          if (this.containsFormElements(node)) return false;
        }
      }
    }
    return true;
  }

  private containsFormElements(node: Node): boolean {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    const element = node as Element;
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'select' || tagName === 'textarea') return true;
    return element.querySelector('input, select, textarea') !== null;
  }

  private clearTimers(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.maxDelayTimer) clearTimeout(this.maxDelayTimer);
    this.debounceTimer = null;
    this.maxDelayTimer = null;
  }

  private sendMessageToBackground(message: ExtractorMessage): void {
    try {
      chrome.runtime.sendMessage(message).catch(() => {});
    } catch {
      // Intentionally ignore errors when extension context is invalid
    }
  }

  getStats() {
    return {
      lastExtractionTime: this.lastExtractionTime,
      isObserving: this.isObserving,
      isExtracting: this.isExtracting
    };
  }

  handleVisibilityChange(): void {
    if (document.hidden) {
      this.stopObserving();
    } else {
      this.startObserving();
    }
  }

  destroy(): void {
    this.stopObserving();
  }
}