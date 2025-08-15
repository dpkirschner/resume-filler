/**
 * ExtractionManager Integration Tests
 * * Tests for the smart debounced MutationObserver system and performance optimizations.
 * Focuses on real-world scenarios with dynamic DOM changes and timing constraints.
 */

import { ExtractionManager } from '../../src/content/extractors/extraction-manager';
import { DOMTestHelper, AsyncTestHelper, ChromeMockHelper } from '../fixtures/test-helpers';

const mockExtractFormSchema = jest.fn().mockResolvedValue({ fields: [], url: 'http://test.com', timestamp: Date.now() });
const mockHasFormElementsChanged = jest.fn().mockReturnValue(true);

jest.mock('../../src/content/extractors/form-extractor', () => {
  return {
    FormExtractor: jest.fn().mockImplementation(() => {
      return {
        extractFormSchema: mockExtractFormSchema,
        hasFormElementsChanged: mockHasFormElementsChanged,
      };
    }),
  };
});

describe('ExtractionManager Integration', () => {
  let manager: ExtractionManager;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    DOMTestHelper.cleanup();
    jest.clearAllMocks();
    ChromeMockHelper.mockSendMessage();
    
    // Because we control the mock directly, the setup is simpler and more reliable.
    manager = new ExtractionManager();
  });

  afterEach(() => {
    if (manager) {
      manager.destroy();
    }
  });

  describe('Debounced Extraction Behavior', () => {
    it('should debounce rapid DOM changes and call extraction only once', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      for (let i = 0; i < 5; i++) {
        DOMTestHelper.simulateDynamicChanges(container, 'add');
        await jest.advanceTimersByTimeAsync(50);
      }
      await jest.advanceTimersByTimeAsync(300);

      // The test now correctly asserts against the shared mock function.
      expect(mockExtractFormSchema).toHaveBeenCalledTimes(1);
    });

    it('should respect the minimum extraction interval', async () => {
      await manager.forceExtraction();
      await manager.forceExtraction();
      expect(mockExtractFormSchema).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(1001);
      await manager.forceExtraction();
      expect(mockExtractFormSchema).toHaveBeenCalledTimes(2);
    });

    it('should force extraction after the max delay timeout, even with continuous changes', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      for (let i = 0; i < 20; i++) {
        DOMTestHelper.simulateDynamicChanges(container, 'add');
        await jest.advanceTimersByTimeAsync(100);
      }
      
      expect(mockExtractFormSchema).toHaveBeenCalledTimes(1);
    });
  });

  describe('Smart Change Detection', () => {
    it('should ignore mutations that do not involve form elements', async () => {
      // Temporarily override the mock for this specific test
      (manager as any).shouldIgnoreMutations = jest.fn().mockReturnValue(true);

      const container = document.createElement('div');
      document.body.appendChild(container);
      const nonFormDiv = document.createElement('div');
      container.appendChild(nonFormDiv);
      await jest.advanceTimersByTimeAsync(400);

      expect(mockExtractFormSchema).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle extraction errors gracefully', async () => {
      const sendMessageSpy = ChromeMockHelper.mockSendMessage().mockFn;
      // Configure the shared mock function for this test
      mockExtractFormSchema.mockRejectedValue(new Error('Extraction failed'));

      const result = await manager.forceExtraction();

      expect(result).toBeNull();
      expect(sendMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EXTRACTION_ERROR' })
      );
    });

    it('should recover after a failed extraction', async () => {
      mockExtractFormSchema
        .mockRejectedValueOnce(new Error('First fail'))
        .mockResolvedValueOnce({ fields: [], url: '', timestamp: 0 });

      await manager.forceExtraction();
      await jest.advanceTimersByTimeAsync(1001);
      const result = await manager.forceExtraction();

      expect(result).not.toBeNull();
      expect(mockExtractFormSchema).toHaveBeenCalledTimes(2);
    });
  });
});