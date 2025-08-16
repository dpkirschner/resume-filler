/**
 * Content Script for Job Application Co-Pilot
 * 
 * Main entry point for form detection and extraction on ATS platforms.
 * Implements Task 4: Form Schema Extractor with intelligent form detection
 * and real-time extraction using performance-optimized MutationObserver.
 */

import { ExtractionManager } from './extractors/extraction-manager';
import { ExtractorMessage } from '../types';

class JobApplicationCoPilot {
  private extractionManager: ExtractionManager;
  private isInitialized = false;

  constructor() {
    this.extractionManager = new ExtractionManager();
    this.init();
  }

  /**
   * Initialize the content script
   */
  private async init(): Promise<void> {
    try {
      console.log('Job Application Co-Pilot: Initializing content script');

      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
      } else {
        this.onDOMReady();
      }

      // Set up message listeners
      this.setupMessageListeners();

      // Set up visibility change handling for performance
      document.addEventListener('visibilitychange', () => {
        this.extractionManager.handleVisibilityChange();
      });

      this.isInitialized = true;
      console.log('Job Application Co-Pilot: Content script initialized successfully');

    } catch (error) {
      console.error('Job Application Co-Pilot: Failed to initialize:', error);
    }
  }

  /**
   * Handle DOM ready event
   */
  private onDOMReady(): void {
    console.log('Job Application Co-Pilot: DOM ready, starting form detection');

    // Perform initial form extraction
    this.performInitialExtraction();

    // Start observing for dynamic changes
    this.extractionManager.startObserving();
  }

  /**
   * Perform initial form extraction on page load
   */
  private async performInitialExtraction(): Promise<void> {
    try {
      const schema = await this.extractionManager.forceExtraction();
      
      if (schema && schema.fields.length > 0) {
        console.log(`Job Application Co-Pilot: Found ${schema.fields.length} form fields on page load`);
        
        // Show subtle indicator that forms were detected
        this.showFormDetectionIndicator(schema.fields.length);
      } else {
        console.log('Job Application Co-Pilot: No form fields detected on page load');
      }
    } catch (error) {
      console.error('Job Application Co-Pilot: Initial extraction failed:', error);
    }
  }

  /**
   * Set up message listeners for communication with background script
   */
  private setupMessageListeners(): void {
    chrome.runtime.onMessage.addListener((message: ExtractorMessage, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Indicate that we will send a response asynchronously
    });
  }

  /**
   * Handle messages from background script
   */
  private async handleMessage(
    message: ExtractorMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: { success: boolean; data?: unknown; error?: string }) => void
  ): Promise<void> {
    try {
      switch (message.type) {
        case 'EXTRACT_FORMS': {
          const schema = await this.extractionManager.forceExtraction();
          sendResponse({ success: true, data: schema });
          break;
        }

        default:
          console.warn('Job Application Co-Pilot: Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Job Application Co-Pilot: Message handling failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      sendResponse({ success: false, error: errorMessage });
    }
  }

  /**
   * Show a subtle indicator that forms were detected
   */
  private showFormDetectionIndicator(fieldCount: number): void {
    // Only show indicator if there are meaningful form fields
    if (fieldCount < 2) {
      return;
    }

    try {
      // Create a subtle indicator element
      const indicator = document.createElement('div');
      indicator.id = 'job-co-pilot-indicator';
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #4CAF50;
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-family: system-ui, sans-serif;
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        transition: opacity 0.3s ease;
        pointer-events: none;
      `;
      indicator.textContent = `✓ ${fieldCount} form fields detected`;

      // Add to page
      document.body.appendChild(indicator);

      // Remove after 3 seconds
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.style.opacity = '0';
          setTimeout(() => {
            indicator.parentNode?.removeChild(indicator);
          }, 300);
        }
      }, 3000);

    } catch (error) {
      // Silently ignore indicator errors
      console.debug('Failed to show form detection indicator:', error);
    }
  }

  /**
   * Get extraction statistics for debugging
   */
  getStats(): { isInitialized: boolean; extractionManager: unknown; url: string; timestamp: number } {
    return {
      isInitialized: this.isInitialized,
      extractionManager: this.extractionManager.getStats(),
      url: window.location.href,
      timestamp: Date.now()
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.extractionManager.destroy();
    document.removeEventListener('visibilitychange', () => {
      this.extractionManager.handleVisibilityChange();
    });
  }
}

// Initialize the content script
const coPilot = new JobApplicationCoPilot();

// Make stats available for debugging
declare global {
  interface Window {
    jobCoPilotStats: () => { isInitialized: boolean; extractionManager: unknown; url: string; timestamp: number };
  }
}

window.jobCoPilotStats = () => coPilot.getStats();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  coPilot.destroy();
});

console.log('Job Application Co-Pilot: Content script loaded and ready');