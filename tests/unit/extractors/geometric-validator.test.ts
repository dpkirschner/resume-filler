/**
 * Geometric Validator Tests
 * * Tests for spatial proximity validation between form elements and labels.
 * Focus on edge cases, performance, and accuracy of geometric calculations.
 */

import { GeometricValidator } from '../../../src/content/extractors/geometric-validator';
import { GeometricValidationConfig } from '../../../src/types';
import { DOMTestHelper } from '../../fixtures/test-helpers';

const setupTestElements = (inputRectDef: DOMRect, labelRectDef: DOMRect) => {
  const input = DOMTestHelper.createFormElement('input');
  const label = DOMTestHelper.createLabel('Test Label');
  
  const { restore: restoreInputMock } = DOMTestHelper.mockElementBounds(input, inputRectDef);
  const { restore: restoreLabelMock } = DOMTestHelper.mockElementBounds(label, labelRectDef);

  return {
    input,
    label,
    restore: () => {
      restoreInputMock();
      restoreLabelMock();
    },
  };
};


describe('GeometricValidator', () => {
  let validator: GeometricValidator;
  let config: GeometricValidationConfig;
  let restoreMocks: () => void;

  beforeEach(() => {
    validator = new GeometricValidator();
    config = {
      maxVerticalDistance: 50,
      maxHorizontalDistance: 200,
      sameRowTolerance: 10
    };
  });

  afterEach(() => {
    if (restoreMocks) {
      restoreMocks();
    }
    DOMTestHelper.cleanup();
  });

  describe('validateLabelProximity', () => {
    
    it.each([
      {
        scenario: 'should validate a label positioned closely above an input',
        inputRect: DOMTestHelper.createBoundingRect(100, 50, 150, 30),
        labelRect: DOMTestHelper.createBoundingRect(100, 20, 100, 25),
        expected: { isValid: true, confidence: 0.7 }
      },
      {
        scenario: 'should validate a label to the left and in the same row',
        inputRect: DOMTestHelper.createBoundingRect(200, 50, 150, 30),
        labelRect: DOMTestHelper.createBoundingRect(100, 55, 90, 20),
        expected: { isValid: true, confidence: 0.8 }
      },
      {
        scenario: 'should reject a label that is too far above',
        inputRect: DOMTestHelper.createBoundingRect(100, 150, 150, 30),
        labelRect: DOMTestHelper.createBoundingRect(100, 50, 100, 25), // 70px gap
        expected: { isValid: false, confidence: 0.5 }
      },
      {
        scenario: 'should reject a label that is too far to the side',
        inputRect: DOMTestHelper.createBoundingRect(100, 50, 150, 30),
        labelRect: DOMTestHelper.createBoundingRect(400, 50, 100, 25), // 250px gap
        expected: { isValid: false, confidence: 0.5 }
      }
    ])('$scenario', ({ inputRect, labelRect, expected }) => {
      // Arrange
      const { input, label, restore } = setupTestElements(inputRect, labelRect);
      restoreMocks = restore;

      // Act
      const result = validator.validateLabelProximity(input, label, config);

      // Assert
      expect(result.isValid).toBe(expected.isValid);
      if (expected.isValid) {
        expect(result.confidence).toBeGreaterThanOrEqual(expected.confidence);
      } else {
        expect(result.confidence).toBeLessThan(expected.confidence);
      }
    });

    it('should handle zero-dimension elements gracefully', () => {
      // Arrange
      const { input, label, restore } = setupTestElements(
        DOMTestHelper.createBoundingRect(0, 0, 0, 0),
        DOMTestHelper.createBoundingRect(100, 50, 100, 25)
      );
      restoreMocks = restore;

      // Act
      const result = validator.validateLabelProximity(input, label, config);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.reason).toContain('Invalid bounding rect');
    });
  });

  describe('confidence scoring accuracy', () => {
    it('should give higher confidence to closer and better-aligned elements', () => {
      // Arrange
      const inputRect = DOMTestHelper.createBoundingRect(100, 50, 150, 30);
      
      const { input, label: closeAlignedLabel, restore: restore1 } = setupTestElements(inputRect, DOMTestHelper.createBoundingRect(100, 30, 100, 15)); // Close and aligned
      const { label: farAlignedLabel, restore: restore2 } = setupTestElements(inputRect, DOMTestHelper.createBoundingRect(100, 0, 100, 15)); // Far and aligned
      const { label: closeMisalignedLabel, restore: restore3 } = setupTestElements(inputRect, DOMTestHelper.createBoundingRect(150, 30, 100, 15)); // Close and misaligned
      
      restoreMocks = () => { restore1(); restore2(); restore3(); };

      // Act
      const closeAlignedResult = validator.validateLabelProximity(input, closeAlignedLabel, config);
      const farAlignedResult = validator.validateLabelProximity(input, farAlignedLabel, config);
      const closeMisalignedResult = validator.validateLabelProximity(input, closeMisalignedLabel, config);

      // Assert
      expect(closeAlignedResult.confidence).toBeGreaterThan(farAlignedResult.confidence);
      expect(closeAlignedResult.confidence).toBeGreaterThan(closeMisalignedResult.confidence);
    });
  });
  
  describe('configuration sensitivity', () => {
    it.each([
      {
        scenario: 'fail with a strict maxVerticalDistance',
        config: { ...config, maxVerticalDistance: 20 },
        inputRect: DOMTestHelper.createBoundingRect(100, 50, 150, 30),
        labelRect: DOMTestHelper.createBoundingRect(100, 25, 100, 0), // 25px gap
      },
      {
        scenario: 'fail with a strict maxHorizontalDistance',
        config: { ...config, maxHorizontalDistance: 50 },
        inputRect: DOMTestHelper.createBoundingRect(200, 50, 150, 30),
        labelRect: DOMTestHelper.createBoundingRect(100, 50, 90, 20), // 100px gap
      },
    ])('should $scenario', ({ config, inputRect, labelRect }) => {
      // Arrange
      const { input, label, restore } = setupTestElements(inputRect, labelRect);
      restoreMocks = restore;
      
      // Act
      const result = validator.validateLabelProximity(input, label, config);

      // Assert
      expect(result.isValid).toBe(false);
    });
  });

  describe('performance', () => {
    it('should complete 1000 validations quickly', () => {
      // Arrange
      const { input, label, restore } = setupTestElements(
        DOMTestHelper.createBoundingRect(100, 50, 150, 30),
        DOMTestHelper.createBoundingRect(100, 30, 100, 15)
      );
      restoreMocks = restore;

      const startTime = performance.now();
      
      // Act
      for (let i = 0; i < 1000; i++) {
        validator.validateLabelProximity(input, label, config);
      }
      
      const duration = performance.now() - startTime;
      
      // Assert
      expect(duration).toBeLessThan(100);
    });
  });
});