/**
 * Tests for Confidence Constants and Utilities
 */

import {
  ConfidenceLevel,
  VENDOR_CONFIDENCE,
  STRATEGY_CONFIDENCE,
  CONFIDENCE_THRESHOLDS,
  ConfidenceUtils,
  type ConfidenceCategory,
  type VendorType
} from '../../../../src/adapters/shared/confidence-constants';

describe('ConfidenceLevel', () => {
  it('should have proper confidence hierarchy', () => {
    expect(ConfidenceLevel.MAXIMUM).toBeGreaterThan(ConfidenceLevel.VERY_HIGH);
    expect(ConfidenceLevel.VERY_HIGH).toBeGreaterThan(ConfidenceLevel.HIGH);
    expect(ConfidenceLevel.HIGH).toBeGreaterThan(ConfidenceLevel.MEDIUM);
    expect(ConfidenceLevel.MEDIUM).toBeGreaterThan(ConfidenceLevel.STANDARD);
    expect(ConfidenceLevel.STANDARD).toBeGreaterThan(ConfidenceLevel.LOW);
    expect(ConfidenceLevel.LOW).toBeGreaterThan(ConfidenceLevel.MINIMUM);
    expect(ConfidenceLevel.MINIMUM).toBeGreaterThan(ConfidenceLevel.FILTER_THRESHOLD);
    expect(ConfidenceLevel.FILTER_THRESHOLD).toBeGreaterThan(ConfidenceLevel.DEVELOPMENT);
  });

  it('should have values within valid range [0, 1]', () => {
    Object.values(ConfidenceLevel).filter(value => typeof value === 'number').forEach(value => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    });
  });

  it('should have reasonable confidence values', () => {
    expect(ConfidenceLevel.MAXIMUM).toBe(0.98);
    expect(ConfidenceLevel.VERY_HIGH).toBe(0.95);
    expect(ConfidenceLevel.HIGH).toBe(0.9);
    expect(ConfidenceLevel.FILTER_THRESHOLD).toBe(0.4);
    expect(ConfidenceLevel.DEVELOPMENT).toBe(0.3);
  });
});

describe('VENDOR_CONFIDENCE', () => {
  it('should have configurations for all major vendors', () => {
    expect(VENDOR_CONFIDENCE.WORKDAY).toBeDefined();
    expect(VENDOR_CONFIDENCE.GREENHOUSE).toBeDefined();
  });

  it('should have Workday-specific confidence values', () => {
    const workday = VENDOR_CONFIDENCE.WORKDAY;
    
    expect(workday.AUTOMATION_ID).toBe(ConfidenceLevel.MAXIMUM);
    expect(workday.NAME_ATTRIBUTE).toBe(ConfidenceLevel.HIGH);
    expect(workday.FILE_UPLOAD).toBe(ConfidenceLevel.HIGH);
    expect(workday.ENHANCED_LABELS).toBe(ConfidenceLevel.STANDARD);
    expect(workday.FILTER).toBe(ConfidenceLevel.DEVELOPMENT);
  });

  it('should have Greenhouse-specific confidence values', () => {
    const greenhouse = VENDOR_CONFIDENCE.GREENHOUSE;
    
    expect(greenhouse.ARIA_LABEL).toBe(ConfidenceLevel.VERY_HIGH);
    expect(greenhouse.NAME_ATTRIBUTE).toBe(ConfidenceLevel.HIGH);
    expect(greenhouse.FILE_UPLOAD).toBe(ConfidenceLevel.HIGH);
    expect(greenhouse.URL_FIELD).toBe(ConfidenceLevel.HIGH);
    expect(greenhouse.FILTER).toBe(ConfidenceLevel.FILTER_THRESHOLD);
  });

  it('should maintain vendor-specific confidence hierarchy', () => {
    // Workday's automation-id should be highest confidence
    expect(VENDOR_CONFIDENCE.WORKDAY.AUTOMATION_ID)
      .toBeGreaterThan(VENDOR_CONFIDENCE.WORKDAY.NAME_ATTRIBUTE);
    
    // Greenhouse's aria-label should be very high
    expect(VENDOR_CONFIDENCE.GREENHOUSE.ARIA_LABEL)
      .toBeGreaterThan(VENDOR_CONFIDENCE.GREENHOUSE.NAME_ATTRIBUTE);
  });
});

describe('STRATEGY_CONFIDENCE', () => {
  it('should have default confidence values for all strategy types', () => {
    expect(STRATEGY_CONFIDENCE.VENDOR_ATTRIBUTE).toBeDefined();
    expect(STRATEGY_CONFIDENCE.GENERIC_ATTRIBUTE).toBeDefined();
    expect(STRATEGY_CONFIDENCE.LABEL_MATCHING).toBeDefined();
    expect(STRATEGY_CONFIDENCE.SELECTOR_MATCHING).toBeDefined();
    expect(STRATEGY_CONFIDENCE.CUSTOM_LOGIC).toBeDefined();
    expect(STRATEGY_CONFIDENCE.PLACEHOLDER).toBeDefined();
  });

  it('should maintain proper strategy confidence hierarchy', () => {
    expect(STRATEGY_CONFIDENCE.VENDOR_ATTRIBUTE)
      .toBeGreaterThan(STRATEGY_CONFIDENCE.GENERIC_ATTRIBUTE);
    expect(STRATEGY_CONFIDENCE.GENERIC_ATTRIBUTE)
      .toBeGreaterThan(STRATEGY_CONFIDENCE.LABEL_MATCHING);
    expect(STRATEGY_CONFIDENCE.LABEL_MATCHING)
      .toBeGreaterThan(STRATEGY_CONFIDENCE.PLACEHOLDER);
  });
});

describe('CONFIDENCE_THRESHOLDS', () => {
  it('should have valid threshold values', () => {
    expect(CONFIDENCE_THRESHOLDS.HIGH).toBe(0.8);
    expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBe(0.5);
    expect(CONFIDENCE_THRESHOLDS.LOW).toBe(0.0);
  });

  it('should maintain threshold hierarchy', () => {
    expect(CONFIDENCE_THRESHOLDS.HIGH)
      .toBeGreaterThan(CONFIDENCE_THRESHOLDS.MEDIUM);
    expect(CONFIDENCE_THRESHOLDS.MEDIUM)
      .toBeGreaterThan(CONFIDENCE_THRESHOLDS.LOW);
  });
});

describe('ConfidenceUtils', () => {
  describe('categorizeConfidence', () => {
    it('should correctly categorize high confidence values', () => {
      expect(ConfidenceUtils.categorizeConfidence(0.9)).toBe('high');
      expect(ConfidenceUtils.categorizeConfidence(0.8)).toBe('high');
      expect(ConfidenceUtils.categorizeConfidence(1.0)).toBe('high');
    });

    it('should correctly categorize medium confidence values', () => {
      expect(ConfidenceUtils.categorizeConfidence(0.7)).toBe('medium');
      expect(ConfidenceUtils.categorizeConfidence(0.5)).toBe('medium');
      expect(ConfidenceUtils.categorizeConfidence(0.6)).toBe('medium');
    });

    it('should correctly categorize low confidence values', () => {
      expect(ConfidenceUtils.categorizeConfidence(0.4)).toBe('low');
      expect(ConfidenceUtils.categorizeConfidence(0.1)).toBe('low');
      expect(ConfidenceUtils.categorizeConfidence(0.0)).toBe('low');
    });

    it('should handle edge cases', () => {
      expect(ConfidenceUtils.categorizeConfidence(0.79999)).toBe('medium');
      expect(ConfidenceUtils.categorizeConfidence(0.49999)).toBe('low');
    });
  });

  describe('validateConfidence', () => {
    it('should validate correct confidence values', () => {
      expect(ConfidenceUtils.validateConfidence(0.0)).toBe(true);
      expect(ConfidenceUtils.validateConfidence(0.5)).toBe(true);
      expect(ConfidenceUtils.validateConfidence(1.0)).toBe(true);
      expect(ConfidenceUtils.validateConfidence(0.99)).toBe(true);
    });

    it('should reject invalid confidence values', () => {
      expect(ConfidenceUtils.validateConfidence(-0.1)).toBe(false);
      expect(ConfidenceUtils.validateConfidence(1.1)).toBe(false);
      expect(ConfidenceUtils.validateConfidence(-1)).toBe(false);
      expect(ConfidenceUtils.validateConfidence(2)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(ConfidenceUtils.validateConfidence(Number.NaN)).toBe(false);
      expect(ConfidenceUtils.validateConfidence(Number.POSITIVE_INFINITY)).toBe(false);
      expect(ConfidenceUtils.validateConfidence(Number.NEGATIVE_INFINITY)).toBe(false);
    });
  });

  describe('clampConfidence', () => {
    it('should clamp values within valid range', () => {
      expect(ConfidenceUtils.clampConfidence(0.5)).toBe(0.5);
      expect(ConfidenceUtils.clampConfidence(0.0)).toBe(0.0);
      expect(ConfidenceUtils.clampConfidence(1.0)).toBe(1.0);
    });

    it('should clamp values above 1 to 1', () => {
      expect(ConfidenceUtils.clampConfidence(1.5)).toBe(1.0);
      expect(ConfidenceUtils.clampConfidence(2.0)).toBe(1.0);
      expect(ConfidenceUtils.clampConfidence(Number.POSITIVE_INFINITY)).toBe(1.0);
    });

    it('should clamp values below 0 to 0', () => {
      expect(ConfidenceUtils.clampConfidence(-0.5)).toBe(0.0);
      expect(ConfidenceUtils.clampConfidence(-1.0)).toBe(0.0);
      expect(ConfidenceUtils.clampConfidence(Number.NEGATIVE_INFINITY)).toBe(0.0);
    });

    it('should handle NaN by returning 0', () => {
      expect(ConfidenceUtils.clampConfidence(Number.NaN)).toBe(0.0);
    });
  });

  describe('adjustConfidence', () => {
    it('should apply confidence modifiers correctly', () => {
      expect(ConfidenceUtils.adjustConfidence(0.8, 1.1)).toBeCloseTo(0.88);
      expect(ConfidenceUtils.adjustConfidence(0.6, 1.5)).toBeCloseTo(0.9);
      expect(ConfidenceUtils.adjustConfidence(0.9, 0.8)).toBeCloseTo(0.72);
    });

    it('should clamp results to valid range', () => {
      expect(ConfidenceUtils.adjustConfidence(0.9, 2.0)).toBe(1.0);
      expect(ConfidenceUtils.adjustConfidence(0.5, 0.1)).toBeCloseTo(0.05);
      expect(ConfidenceUtils.adjustConfidence(0.1, 0.1)).toBeCloseTo(0.01);
    });

    it('should handle edge cases', () => {
      expect(ConfidenceUtils.adjustConfidence(0.0, 2.0)).toBe(0.0);
      expect(ConfidenceUtils.adjustConfidence(1.0, 0.0)).toBe(0.0);
      expect(ConfidenceUtils.adjustConfidence(0.5, 1.0)).toBe(0.5);
    });
  });

  describe('getVendorConfidence', () => {
    it('should return correct confidence for Workday strategies', () => {
      expect(ConfidenceUtils.getVendorConfidence('WORKDAY', 'AUTOMATION_ID'))
        .toBe(VENDOR_CONFIDENCE.WORKDAY.AUTOMATION_ID);
      expect(ConfidenceUtils.getVendorConfidence('WORKDAY', 'NAME_ATTRIBUTE'))
        .toBe(VENDOR_CONFIDENCE.WORKDAY.NAME_ATTRIBUTE);
    });

    it('should return correct confidence for Greenhouse strategies', () => {
      expect(ConfidenceUtils.getVendorConfidence('GREENHOUSE', 'ARIA_LABEL'))
        .toBe(VENDOR_CONFIDENCE.GREENHOUSE.ARIA_LABEL);
      expect(ConfidenceUtils.getVendorConfidence('GREENHOUSE', 'FILE_UPLOAD'))
        .toBe(VENDOR_CONFIDENCE.GREENHOUSE.FILE_UPLOAD);
    });

    it('should return default confidence for unknown strategies', () => {
      expect(ConfidenceUtils.getVendorConfidence('WORKDAY', 'UNKNOWN_STRATEGY'))
        .toBe(STRATEGY_CONFIDENCE.GENERIC_ATTRIBUTE);
      expect(ConfidenceUtils.getVendorConfidence('GREENHOUSE', 'INVALID'))
        .toBe(STRATEGY_CONFIDENCE.GENERIC_ATTRIBUTE);
    });

    it('should handle case sensitivity', () => {
      expect(ConfidenceUtils.getVendorConfidence('WORKDAY', 'automation_id'))
        .toBe(VENDOR_CONFIDENCE.WORKDAY.AUTOMATION_ID);
      expect(ConfidenceUtils.getVendorConfidence('WORKDAY', 'name_attribute'))
        .toBe(VENDOR_CONFIDENCE.WORKDAY.NAME_ATTRIBUTE);
    });
  });
});

describe('Type Exports', () => {
  it('should export ConfidenceCategory type', () => {
    const category: ConfidenceCategory = 'high';
    expect(['high', 'medium', 'low']).toContain(category);
  });

  it('should export VendorType type', () => {
    const vendor: VendorType = 'WORKDAY';
    expect(['WORKDAY', 'GREENHOUSE']).toContain(vendor);
  });
});

describe('Integration Tests', () => {
  it('should work together for typical adapter workflow', () => {
    // Typical workflow: get vendor confidence, validate, categorize
    const confidence = ConfidenceUtils.getVendorConfidence('WORKDAY', 'AUTOMATION_ID');
    expect(ConfidenceUtils.validateConfidence(confidence)).toBe(true);
    expect(ConfidenceUtils.categorizeConfidence(confidence)).toBe('high');
  });

  it('should handle confidence adjustment workflow', () => {
    // Start with base confidence, apply modifier, clamp, and categorize
    const baseConfidence = STRATEGY_CONFIDENCE.LABEL_MATCHING;
    const adjusted = ConfidenceUtils.adjustConfidence(baseConfidence, 1.2);
    const clamped = ConfidenceUtils.clampConfidence(adjusted);
    const category = ConfidenceUtils.categorizeConfidence(clamped);
    
    expect(ConfidenceUtils.validateConfidence(clamped)).toBe(true);
    expect(['high', 'medium', 'low']).toContain(category);
  });

  it('should maintain consistency across all vendor configs', () => {
    // Ensure all vendor confidence values are valid
    Object.values(VENDOR_CONFIDENCE).forEach(vendorConfig => {
      Object.values(vendorConfig).forEach(confidence => {
        expect(ConfidenceUtils.validateConfidence(confidence)).toBe(true);
      });
    });

    // Ensure all strategy confidence values are valid
    Object.values(STRATEGY_CONFIDENCE).forEach(confidence => {
      expect(ConfidenceUtils.validateConfidence(confidence)).toBe(true);
    });
  });
});