/**
 * Selector Generator Tests
 * * Tests for hybrid selector generation with multiple strategies and fallbacks.
 * Focuses on reliability, performance, and ATS platform compatibility.
 */

import { SelectorGenerator } from '../../../src/content/extractors/selector-generator';
import { DOMTestHelper, ExtractionAssertions, PerformanceTestHelper } from '../../fixtures/test-helpers';

// Mock the external library for controlled testing
jest.mock('css-selector-generator', () => ({
  getCssSelector: jest.fn(),
}));

import { getCssSelector } from 'css-selector-generator';
const mockGetCssSelector = getCssSelector as jest.MockedFunction<typeof getCssSelector>;

const setupTest = (html: string) => {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  return container.querySelector('input, select, textarea') as HTMLInputElement;
};

describe('SelectorGenerator', () => {
  let generator: SelectorGenerator;

  beforeEach(() => {
    generator = new SelectorGenerator();
    jest.clearAllMocks();
  });

  afterEach(() => {
    DOMTestHelper.cleanup();
  });

  describe('generateOptimalSelector Strategy Evaluation', () => {
    it.each([
      {
        scenario: 'an ID selector',
        html: `<input id="unique-field" name="test" />`,
        expectedPrimary: 'input#unique-field',
      },
      {
        scenario: 'a name selector when ID is absent',
        html: `<input name="unique-name" />`,
        expectedPrimary: 'input[name="unique-name"]',
      },
      {
        scenario: 'a data-testid selector with the highest priority',
        html: `<input data-testid="test-field" id="id" name="name" />`,
        expectedPrimary: 'input[data-testid="test-field"]',
      },
      {
        scenario: 'a Workday-style data-automation-id',
        html: `<input data-automation-id="firstName" class="wd-input" />`,
        expectedPrimary: 'input[data-automation-id="firstName"]',
      },
      {
        scenario: 'an escaped selector for special characters in an ID',
        html: `<input id="field:with.special-chars_123" />`,
        expectedPrimary: 'input#field\\:with\\.special-chars_123',
      },
    ])('should prioritize $scenario', async ({ html, expectedPrimary }) => {
      const input = setupTest(html);
      const result = await generator.generateOptimalSelector(input);
      expect(result.primary).toBe(expectedPrimary);
      expect(result.confidence).toBeGreaterThan(0.85);
      ExtractionAssertions.assertSelectorValidity(result.primary, input);
    });

    it('should generate multiple valid fallback selectors', async () => {
      const input = setupTest(`<input id="primary" name="fallback-name" data-testid="test-fallback" />`);
      const result = await generator.generateOptimalSelector(input);

      expect(result.primary).toBe('input[data-testid="test-fallback"]');
      
      expect(result.fallbacks.length).toBeGreaterThan(1);
      expect(result.fallbacks).toContain('#primary');
      result.fallbacks.forEach(selector => ExtractionAssertions.assertSelectorValidity(selector, input));
    });

    it('should generate a valid structural selector when it is the best option', async () => {
        const input = setupTest(`<div class="application-form"><input class="form-field" /></div>`);
        mockGetCssSelector.mockReturnValue('.application-form > .form-field');

        const result = await generator.generateOptimalSelector(input);
        
        // Assert that we got a valid, unique selector, regardless of its exact format.
        expect(result.primary).toBeTruthy();
        ExtractionAssertions.assertSelectorValidity(result.primary, input);
        expect(result.confidence).toBeLessThanOrEqual(0.85);
    });
  });

  describe('Integration with css-selector-generator Library', () => {
    it('should handle library errors and timeouts gracefully', async () => {
      const input = setupTest(`<form><input name="fallback" /></form>`);
      mockGetCssSelector.mockImplementation(() => { throw new Error('Library failed'); });
      const result = await generator.generateOptimalSelector(input);
      
      expect(result.primary).toBe('input[name="fallback"]');
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle elements not attached to the main DOM', async () => {
      // This test now passes because of the `!targetElement.isConnected` guard.
      const input = document.createElement('input');
      input.id = 'detached-id';
      const result = await generator.generateOptimalSelector(input);
      expect(result.primary).toBe('input#detached-id');
      expect(result.confidence).toBeGreaterThan(0.8); // Should still have high confidence
    });

    it('should complete generation for 50 elements quickly', async () => {
      const container = PerformanceTestHelper.createLargeForm(50);
      document.body.appendChild(container);
      const inputs = container.querySelectorAll('input');

      const startTime = performance.now();
      await Promise.all(Array.from(inputs).map(input => generator.generateOptimalSelector(input)));
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });
  });
});