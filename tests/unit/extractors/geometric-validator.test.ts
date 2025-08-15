/**
 * Geometric Validator Tests
 * * Tests for spatial proximity validation between form elements and labels.
 * Focus on edge cases, performance, and accuracy of geometric calculations.
 */

import { GeometricValidator } from '../../../src/content/extractors/geometric-validator';
import { GeometricValidationConfig } from '../../../src/types';
import { DOMTestHelper } from '../../fixtures/test-helpers';

// Helper to reduce boilerplate in test setup
const setupTestElements = (inputRectDef: DOMRect, labelRectDef: DOMRect) => {
  const input = DOMTestHelper.createFormElement('input');
  const label = DOMTestHelper.createLabel('Test Label');
  
  const { restore: restoreInputMock } = DOMTestHelper.mockElementBounds(input, inputRectDef);
  const { restore: restoreLabelMock } = DOMTestHelper.mockElementBounds(label, labelRectDef);

  return { input, label, restore: () => { restoreInputMock(); restoreLabelMock(); } };
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
    if (restoreMocks) restoreMocks();
    DOMTestHelper.cleanup();
  });

  describe('validateLabelProximity', () => {
    
    it.each([
      // Positive Cases
      {
        scenario: 'should validate a label positioned closely above an input',
        inputRect: DOMTestHelper.createBoundingRect(100, 50, 150, 30),
        labelRect: DOMTestHelper.createBoundingRect(100, 20, 100, 25), // 5px gap
        expected: { isValid: true, confidence: 0.8 }
      },
      {
        scenario: 'should validate a label to the left and in the same row',
        inputRect: DOMTestHelper.createBoundingRect(210, 50, 150, 30),
        labelRect: DOMTestHelper.createBoundingRect(100, 55, 100, 20), // 10px gap
        expected: { isValid: true, confidence: 0.8 }
      },
      // Negative Cases
      {
        scenario: 'should reject a label that is too far above',
        inputRect: DOMTestHelper.createBoundingRect(100, 150, 150, 30),
        labelRect: DOMTestHelper.createBoundingRect(100, 50, 100, 25), // 75px gap
        expected: { isValid: false, confidence: 0.5 }
      },
      {
        scenario: 'should reject a label that is too far to the side',
        inputRect: DOMTestHelper.createBoundingRect(310, 50, 150, 30),
        labelRect: DOMTestHelper.createBoundingRect(100, 50, 100, 25), // 210px gap
        expected: { isValid: false, confidence: 0.5 }
      },
      {
        scenario: 'should reject a label positioned to the right of an input',
        inputRect: DOMTestHelper.createBoundingRect(100, 50, 150, 30),
        labelRect: DOMTestHelper.createBoundingRect(300, 50, 100, 25),
        expected: { isValid: false, confidence: 0.1 }
      },
      {
        scenario: 'should reject a label positioned below an input',
        inputRect: DOMTestHelper.createBoundingRect(100, 50, 150, 30),
        labelRect: DOMTestHelper.createBoundingRect(100, 100, 100, 25),
        expected: { isValid: false, confidence: 0.1 }
      },
      {
        scenario: 'should reject a label that overlaps with the input',
        inputRect: DOMTestHelper.createBoundingRect(100, 50, 150, 30),
        labelRect: DOMTestHelper.createBoundingRect(110, 60, 50, 10),
        expected: { isValid: false, confidence: 0.1 }
      },
      {
        scenario: 'should reject a label just beyond the max vertical distance',
        inputRect: DOMTestHelper.createBoundingRect(100, 100, 150, 30),
        labelRect: DOMTestHelper.createBoundingRect(100, 0, 100, 49), // 51px gap
        expected: { isValid: false, confidence: 0.1 }
      },
    ])('$scenario', ({ inputRect, labelRect, expected }) => {
      const { input, label, restore } = setupTestElements(inputRect, labelRect);
      restoreMocks = restore;
      const result = validator.validateLabelProximity(input, label, config);
      expect(result.isValid).toBe(expected.isValid);
      if (expected.isValid) {
        expect(result.confidence).toBeGreaterThanOrEqual(expected.confidence);
      } else {
        expect(result.confidence).toBeLessThan(expected.confidence);
      }
    });

    it('should handle zero-dimension elements gracefully', () => {
      const { input, label, restore } = setupTestElements(
        DOMTestHelper.createBoundingRect(0, 0, 0, 0),
        DOMTestHelper.createBoundingRect(100, 50, 100, 25)
      );
      restoreMocks = restore;
      const result = validator.validateLabelProximity(input, label, config);
      expect(result.isValid).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe('getLayoutRelationship', () => {
    it.each([
      { scenario: 'above', inputRect: { x: 50, y: 50 }, textRect: { x: 50, y: 20 }, expected: 'above' },
      { scenario: 'left', inputRect: { x: 150, y: 50 }, textRect: { x: 20, y: 50 }, expected: 'left' },
      { scenario: 'right', inputRect: { x: 50, y: 50 }, textRect: { x: 150, y: 50 }, expected: 'right' },
      { scenario: 'below', inputRect: { x: 50, y: 20 }, textRect: { x: 50, y: 50 }, expected: 'below' },
      { scenario: 'overlapping', inputRect: { x: 50, y: 50 }, textRect: { x: 50, y: 50 }, expected: 'overlapping' },
      { scenario: 'distant', inputRect: { x: 50, y: 50 }, textRect: { x: 500, y: 500 }, expected: 'distant' },
    ])('should correctly identify the layout relationship as "$expected"', ({ inputRect, textRect, expected }) => {
        const input = DOMTestHelper.createBoundingRect(inputRect.x, inputRect.y, 100, 20);
        const text = DOMTestHelper.createBoundingRect(textRect.x, textRect.y, 80, 20);

        const relationship = validator.getLayoutRelationship(input, text);
        expect(relationship).toBe(expected);
    });
  });

  describe('configuration sensitivity', () => {
    it('should pass validation if confidence meets a custom threshold', () => {
      const { input, label, restore } = setupTestElements(
        DOMTestHelper.createBoundingRect(100, 50, 150, 30),
        DOMTestHelper.createBoundingRect(100, 10, 100, 30) // 10px gap, moderate confidence
      );
      restoreMocks = restore;
      
      // Act: Use a lower threshold of 0.5
      const result = validator.validateLabelProximity(input, label, config, 0.5);

      // Assert: Should now be valid because confidence (around 0.8) is > 0.5
      expect(result.isValid).toBe(true);
    });
  });
});