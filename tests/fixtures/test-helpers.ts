/**
 * Test Helper Utilities
 * * Utilities for DOM manipulation, assertions, and test setup
 * following @testing-library best practices.
 */

import { FormLayoutFixture } from './form-layouts';

/**
 * DOM Utilities for test setup
 */
export class DOMTestHelper {
  /**
   * Set up a clean DOM environment with a form fixture
   */
  static setupFixture(fixture: FormLayoutFixture): HTMLElement {
    document.body.innerHTML = '';
    const container = document.createElement('div');
    container.setAttribute('data-testid', 'test-container');
    container.innerHTML = fixture.html;
    document.body.appendChild(container);
    return container;
  }

  /**
   * Clean up DOM after test
   */
  static cleanup(): void {
    document.body.innerHTML = '';
  }

  /**
   * Create a bounding rect mock for geometric testing
   */
  static createBoundingRect(x: number, y: number, width: number, height: number): DOMRect {
    return {
      x, y, width, height, top: y, left: x, bottom: y + height, right: x + width,
      toJSON: () => ({ x, y, width, height, top: y, left: x, bottom: y + height, right: x + width })
    } as DOMRect;
  }

  /**
   * Mock getBoundingClientRect for an element and return a restore function.
   */
  static mockElementBounds(element: Element, rect: DOMRect): { restore: () => void } {
    const originalGetBoundingClientRect = element.getBoundingClientRect;

    const mockGetBoundingClientRect = jest.fn(() => rect);
    Object.defineProperty(element, 'getBoundingClientRect', {
      value: mockGetBoundingClientRect,
      configurable: true
    });

    return {
      restore: () => {
        Object.defineProperty(element, 'getBoundingClientRect', {
          value: originalGetBoundingClientRect,
        });
      }
    };
  }

  /**
   * Create a form element with specified attributes
   */
  static createFormElement(
    tagName: 'input' | 'select' | 'textarea',
    attributes: Record<string, string> = {},
    options: string[] = []
  ): HTMLElement {
    const element = document.createElement(tagName);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));

    if (tagName === 'select' && options.length > 0) {
      options.forEach(optionText => {
        const option = document.createElement('option');
        option.value = optionText.toLowerCase().replace(/\s+/g, '-');
        option.textContent = optionText;
        element.appendChild(option);
      });
    }
    return element;
  }

  /**
   * Create a label element
   */
  static createLabel(text: string, forId?: string): HTMLLabelElement {
    const label = document.createElement('label');
    label.textContent = text;
    if (forId) {
      label.setAttribute('for', forId);
    }
    return label;
  }

  /**
   * Create a geometric layout, returning elements for the test to mock.
   */
  static createGeometricLayout(): {
    container: HTMLElement;
    elements: { input: HTMLInputElement; label: HTMLElement }[];
  } {
    const container = document.createElement('div');
    container.style.position = 'relative';

    const elementConfigs = [
      { name: 'close-field', labelText: 'Close Label' },
      { name: 'far-field', labelText: 'Far Label' },
      { name: 'next-row-field', labelText: 'Next Row Label' }
    ];

    const elements = elementConfigs.map(({ name, labelText }) => {
      const input = this.createFormElement('input', { name }) as HTMLInputElement;
      const label = this.createLabel(labelText);
      container.appendChild(label);
      container.appendChild(input);
      return { input, label };
    });

    return { container, elements };
  }

  /**
   * Simulate dynamic content changes for MutationObserver testing
   */
  static simulateDynamicChanges(container: HTMLElement, changeType: 'add' | 'remove' | 'modify'): void {
    switch (changeType) {
      case 'add':
        const newField = document.createElement('div');
        newField.innerHTML = `
          <label for="dynamic-field">Dynamic Field</label>
          <input type="text" id="dynamic-field" name="dynamic" />
        `;
        container.appendChild(newField);
        break;
        
      case 'remove':
        const firstInput = container.querySelector('input');
        if (firstInput?.parentNode) {
          firstInput.parentNode.removeChild(firstInput);
        }
        break;
        
      case 'modify':
        const input = container.querySelector('input');
        if (input) {
          input.setAttribute('data-modified', 'true');
        }
        break;
    }
  }
}

/**
 * Performance measurement utilities
 */
export class PerformanceTestHelper {
  /**
   * Measure execution time of an async function
   */
  static async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  }

  /**
   * Create a large DOM structure for performance testing
   */
  static createLargeForm(fieldCount: number): HTMLElement {
    const form = document.createElement('form');
    form.setAttribute('data-testid', 'large-form');

    for (let i = 0; i < fieldCount; i++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'field-wrapper';
      
      const label = document.createElement('label');
      label.setAttribute('for', `field-${i}`);
      label.textContent = `Field ${i + 1}`;
      
      const input = document.createElement('input');
      input.type = 'text';
      input.id = `field-${i}`;
      input.name = `field-${i}`;
      
      wrapper.appendChild(label);
      wrapper.appendChild(input);
      form.appendChild(wrapper);
    }

    return form;
  }
}

/**
 * Assertion helpers for form extraction testing
 */
export class ExtractionAssertions {
  /**
   * Assert that a form field schema has required properties
   */
  static assertValidFormField(field: any, fieldName: string): void {
    expect(field).toBeDefined();
    expect(field).toHaveProperty('idx');
    expect(field).toHaveProperty('label');
    expect(field).toHaveProperty('labelSource');
    expect(field).toHaveProperty('labelConfidence');
    expect(field).toHaveProperty('selector');
    expect(field).toHaveProperty('fallbackSelectors');
    expect(field).toHaveProperty('attributes');

    // Type validations
    expect(typeof field.idx).toBe('number');
    expect(typeof field.label).toBe('string');
    expect(typeof field.labelConfidence).toBe('number');
    expect(field.labelConfidence).toBeGreaterThanOrEqual(0);
    expect(field.labelConfidence).toBeLessThanOrEqual(1);
    expect(Array.isArray(field.fallbackSelectors)).toBe(true);
  }

  /**
   * Assert confidence score is within acceptable range
   */
  static assertConfidenceScore(
    confidence: number, 
    minExpected: number = 0.5,
    operation: string = 'operation'
  ): void {
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
    
    if (confidence < minExpected) {
      console.warn(
        `Low confidence score for ${operation}: ${confidence.toFixed(2)} < ${minExpected}`
      );
    }
  }

  /**
   * Assert that a selector is valid and finds the expected element
   */
  static assertSelectorValidity(selector: string, expectedElement: Element): void {
    expect(selector).toBeTruthy();
    expect(typeof selector).toBe('string');
    
    const foundElement = document.querySelector(selector);
    expect(foundElement).toBe(expectedElement);
  }

  /**
   * Assert extraction results match expectations
   */
  static assertExtractionResults(
    results: any,
    expectedFieldCount: number,
    minConfidence: number = 0.5
  ): void {
    expect(results).toBeDefined();
    expect(results).toHaveProperty('fields');
    expect(results).toHaveProperty('url');
    expect(results).toHaveProperty('timestamp');
    
    expect(Array.isArray(results.fields)).toBe(true);
    expect(results.fields).toHaveLength(expectedFieldCount);
    
    // Check each field
    results.fields.forEach((field: any, index: number) => {
      this.assertValidFormField(field, `field-${index}`);
      this.assertConfidenceScore(field.labelConfidence, minConfidence, `field-${index} label`);
    });
  }
}

/**
 * Mock utilities for Chrome extension APIs
 */
export class ChromeMockHelper {
  /**
   * Mock chrome.runtime.sendMessage and return a restore function.
   */
  static mockSendMessage(implementation?: (message: any) => Promise<any>): {
    mockFn: jest.SpyInstance;
    restore: () => void;
  } {
    const originalSendMessage = global.chrome?.runtime?.sendMessage;
    const mockFn = implementation || jest.fn().mockResolvedValue({});

    if (global.chrome?.runtime) {
      global.chrome.runtime.sendMessage = mockFn as any;
    }

    return {
      mockFn: mockFn as jest.SpyInstance,
      restore: () => {
        if (global.chrome?.runtime) {
          global.chrome.runtime.sendMessage = originalSendMessage;
        }
      }
    };
  }

  /**
   * Reset all Chrome API mocks
   */
  static resetMocks(): void {
    jest.clearAllMocks();
  }
}

/**
 * Async utilities for testing
 */
export class AsyncTestHelper {
  /**
   * Wait for a condition to be true with timeout
   */
  static async waitFor(
    condition: () => boolean,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (condition()) {
        return;
      }
      await this.sleep(interval);
    }
    
    throw new Error(`Condition not met within ${timeout}ms timeout`);
  }

  /**
   * Sleep for specified milliseconds
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait for next tick
   */
  static async nextTick(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }
}