/**
 * Standardized Confidence Constants for Adapter Mapping
 * Centralizes all confidence thresholds to ensure consistency across adapters
 */

/**
 * Primary confidence levels for mapping strategies
 * These represent the core confidence tiers used throughout the system
 */
export enum ConfidenceLevel {
  /** Maximum confidence for exact vendor-specific matches (95-100%) */
  MAXIMUM = 0.98,
  
  /** Very high confidence for primary identifiers (90-95%) */
  VERY_HIGH = 0.95,
  
  /** High confidence for secondary identifiers (85-90%) */
  HIGH = 0.9,
  
  /** Medium confidence for heuristic matches (75-85%) */
  MEDIUM = 0.85,
  
  /** Standard confidence for common patterns (70-75%) */
  STANDARD = 0.8,
  
  /** Low confidence for fallback strategies (60-70%) */
  LOW = 0.7,
  
  /** Minimum confidence for partial matches (50-60%) */
  MINIMUM = 0.6,
  
  /** Filter threshold - mappings below this are discarded */
  FILTER_THRESHOLD = 0.4,
  
  /** Very low threshold for development/testing */
  DEVELOPMENT = 0.3
}

/**
 * Vendor-specific confidence configurations
 * Each vendor has tuned confidence values based on their platform characteristics
 */
export const VENDOR_CONFIDENCE = {
  WORKDAY: {
    /** Workday's data-automation-id is highly reliable */
    AUTOMATION_ID: ConfidenceLevel.MAXIMUM,
    /** Name attributes are reliable but less specific */
    NAME_ATTRIBUTE: ConfidenceLevel.HIGH,
    /** File uploads are easy to detect reliably */
    FILE_UPLOAD: ConfidenceLevel.HIGH,
    /** Location dropdowns have unique patterns */
    LOCATION_DROPDOWN: ConfidenceLevel.HIGH,
    /** Enhanced label matching is moderately reliable */
    ENHANCED_LABELS: ConfidenceLevel.STANDARD,
    /** Filter threshold for Workday forms */
    FILTER: ConfidenceLevel.DEVELOPMENT
  },
  
  GREENHOUSE: {
    /** Greenhouse aria-labels are very specific */
    ARIA_LABEL: ConfidenceLevel.VERY_HIGH,
    /** Name attributes follow consistent patterns */
    NAME_ATTRIBUTE: ConfidenceLevel.HIGH,
    /** File inputs are clearly identifiable */
    FILE_UPLOAD: ConfidenceLevel.HIGH,
    /** URL fields have distinct patterns */
    URL_FIELD: ConfidenceLevel.HIGH,
    /** Textareas for cover letters are reliable */
    TEXTAREA: ConfidenceLevel.HIGH,
    /** Filter threshold for Greenhouse forms */
    FILTER: ConfidenceLevel.FILTER_THRESHOLD
  }
} as const;

/**
 * Strategy-specific confidence defaults
 * Used when specific vendor configurations aren't available
 */
export const STRATEGY_CONFIDENCE = {
  /** Exact attribute matches with vendor-specific selectors */
  VENDOR_ATTRIBUTE: ConfidenceLevel.VERY_HIGH,
  
  /** Generic attribute matching */
  GENERIC_ATTRIBUTE: ConfidenceLevel.HIGH,
  
  /** Label-based matching with synonyms */
  LABEL_MATCHING: ConfidenceLevel.STANDARD,
  
  /** CSS selector pattern matching */
  SELECTOR_MATCHING: ConfidenceLevel.MEDIUM,
  
  /** Custom logic and heuristics */
  CUSTOM_LOGIC: ConfidenceLevel.MEDIUM,
  
  /** Placeholder/hint-based matching */
  PLACEHOLDER: ConfidenceLevel.LOW
} as const;

/**
 * Confidence threshold categories for filtering and statistics
 */
export const CONFIDENCE_THRESHOLDS = {
  /** High confidence category (>= 80%) */
  HIGH: 0.8,
  
  /** Medium confidence category (50-80%) */
  MEDIUM: 0.5,
  
  /** Low confidence category (< 50%) */
  LOW: 0.0
} as const;

/**
 * Helper functions for confidence management
 */
export class ConfidenceUtils {
  /**
   * Categorizes a confidence score into high/medium/low
   */
  static categorizeConfidence(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'high';
    if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium';
    return 'low';
  }
  
  /**
   * Validates that a confidence score is within valid range
   */
  static validateConfidence(confidence: number): boolean {
    return confidence >= 0 && confidence <= 1;
  }
  
  /**
   * Clamps a confidence score to valid range [0, 1]
   */
  static clampConfidence(confidence: number): number {
    if (Number.isNaN(confidence)) return 0;
    return Math.max(0, Math.min(1, confidence));
  }
  
  /**
   * Applies a confidence modifier while keeping within valid range
   */
  static adjustConfidence(baseConfidence: number, modifier: number): number {
    return this.clampConfidence(baseConfidence * modifier);
  }
  
  /**
   * Gets vendor-specific confidence for a strategy
   */
  static getVendorConfidence(
    vendor: keyof typeof VENDOR_CONFIDENCE,
    strategy: string
  ): number {
    const vendorConfig = VENDOR_CONFIDENCE[vendor];
    const strategyKey = strategy.toUpperCase() as keyof typeof vendorConfig;
    return vendorConfig[strategyKey] || STRATEGY_CONFIDENCE.GENERIC_ATTRIBUTE;
  }
}

/**
 * Type definitions for confidence-related functionality
 */
export type ConfidenceCategory = 'high' | 'medium' | 'low';
export type VendorType = keyof typeof VENDOR_CONFIDENCE;
export type ConfidenceTier = keyof typeof ConfidenceLevel;