/**
 * Label Associator Tests
 * * Tests for the multi-strategy label detection system.
 */

import { LabelAssociator } from '../../../src/content/extractors/label-associator';
import { GeometricValidationConfig } from '../../../src/types';
import { DOMTestHelper } from '../../fixtures/test-helpers';

const setupTest = (html: string) => {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  return container.querySelector('input, select, textarea') as HTMLInputElement;
};

describe('LabelAssociator', () => {
  let associator: LabelAssociator;
  let config: GeometricValidationConfig;
  let restoreMocks: (() => void) | null = null;

  beforeEach(() => {
    config = {
      maxVerticalDistance: 50,
      maxHorizontalDistance: 200,
      sameRowTolerance: 10
    };
    associator = new LabelAssociator(config);
  });

  afterEach(() => {
    if (restoreMocks) {
      restoreMocks();
      restoreMocks = null;
    }
    DOMTestHelper.cleanup();
  });

  describe('High-Confidence Strategies', () => {
    it.each([
      {
        strategy: 'for-attribute',
        html: `<label for="test-input">Email Address</label><input type="email" id="test-input" />`,
        expectedLabel: 'Email Address',
        expectedConfidence: 0.9,
      },
      {
        strategy: 'wrapping-label',
        html: `<label>Full Name<input type="text" /></label>`,
        expectedLabel: 'Full Name',
        expectedConfidence: 0.8,
      },
      {
        strategy: 'aria-label',
        html: `<input type="text" aria-label="Search Query" />`,
        expectedLabel: 'Search Query',
        expectedConfidence: 0.8,
      },
      {
        strategy: 'aria-labelledby',
        html: `<div id="user-label">Username</div><input type="text" aria-labelledby="user-label" />`,
        expectedLabel: 'Username',
        expectedConfidence: 0.8,
      },
      {
        strategy: 'multiple aria-labelledby',
        html: `<div id="s1">Info</div> <div id="s2">Name</div><input aria-labelledby="s1 s2" />`,
        expectedLabel: 'Info Name',
        expectedConfidence: 0.8,
      },
    ])('should find label via $strategy with high confidence', async ({ html, expectedLabel, expectedConfidence }) => {
      // Arrange
      const input = setupTest(html);

      // Act
      const result = await associator.associateLabel(input);

      // Assert
      expect(result.label).toBe(expectedLabel);
      expect(result.confidence).toBeGreaterThan(expectedConfidence);
    });
  });

  describe('Fallback and Heuristic Strategies', () => {
    it('should use placeholder with moderate confidence', async () => {
      const input = setupTest(`<input placeholder="Enter your full name" />`);
      const result = await associator.associateLabel(input);

      expect(result.label).toBe('Enter your full name');
      expect(result.source).toBe('placeholder');
      expect(result.confidence).toBeGreaterThan(0.4);
      expect(result.confidence).toBeLessThan(0.8);
    });

    it('should find the closest label using geometric proximity', async () => {
      // Arrange
      const input = setupTest(`
        <span id="far-label">Far Label</span>
        <span id="close-label">Close Label</span>
        <input type="text" />
      `);
      const farLabel = document.getElementById('far-label') as HTMLElement;
      const closeLabel = document.getElementById('close-label') as HTMLElement;

      const { restore: r1 } = DOMTestHelper.mockElementBounds(input, DOMTestHelper.createBoundingRect(100, 50, 150, 30));
      const { restore: r2 } = DOMTestHelper.mockElementBounds(farLabel, DOMTestHelper.createBoundingRect(100, 10, 80, 20));
      const { restore: r3 } = DOMTestHelper.mockElementBounds(closeLabel, DOMTestHelper.createBoundingRect(100, 30, 90, 15));
      restoreMocks = () => { r1(); r2(); r3(); };

      // Act
      const result = await associator.associateLabel(input);

      // Assert
      expect(result.label).toBe('Close Label');
      expect(result.source).toBe('geometric-proximity');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Strategy Priority and Fallback Logic', () => {
    it('should prioritize a `for` attribute over a placeholder', async () => {
      const input = setupTest(`<label for="test">Official</label><input id="test" placeholder="Placeholder" />`);
      const result = await associator.associateLabel(input);
      expect(result.label).toBe('Official');
      expect(result.source).toBe('for-attribute');
    });

    it('should correctly fall back to the best available option', async () => {
      // Arrange
      const input = setupTest(`<div><span>Nearby Text</span><input /></div>`);
      const span = document.querySelector('span') as HTMLElement;

      const { restore: r1 } = DOMTestHelper.mockElementBounds(input, DOMTestHelper.createBoundingRect(100, 50, 150, 30));
      const { restore: r2 } = DOMTestHelper.mockElementBounds(span, DOMTestHelper.createBoundingRect(100, 10, 80, 20));
      restoreMocks = () => { r1(); r2(); };

      // Act
      const result = await associator.associateLabel(input);
      
      // Assert: Geometric is not high-confidence, so it's a fallback result.
      expect(result.label).toBe('Nearby Text');
      expect(result.confidence).toBeLessThan(0.7);
    });
  });

  describe('Edge Cases', () => {
    it('should return a zero-confidence result for elements with no possible labels', async () => {
      const input = setupTest(`<input type="text" />`);
      const result = await associator.associateLabel(input);
      expect(result.confidence).toBe(0);
    });

    it('should gracefully handle invalid inputs like null or undefined', async () => {
      // @ts-expect-error Testing invalid input
      const nullResult = await associator.associateLabel(null);
      // @ts-expect-error Testing invalid input
      const undefinedResult = await associator.associateLabel(undefined);

      expect(nullResult.confidence).toBe(0);
      expect(undefinedResult.confidence).toBe(0);
    });
  });
});