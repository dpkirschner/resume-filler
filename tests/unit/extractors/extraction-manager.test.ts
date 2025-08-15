/**
 * ExtractionManager Unit Tests
 * * Tests the ExtractionManager in isolation by mocking all external dependencies,
 * including FormExtractor, MutationObserver, and timers.
 */

import { ExtractionManager } from '../../../src/content/extractors/extraction-manager';
// Import the class we are going to mock.
import { FormExtractor } from '../../../src/content/extractors/form-extractor';

// Mock the FormExtractor dependency
jest.mock('../../../src/content/extractors/form-extractor');

// Mock the global MutationObserver
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();
let mutationCallback: (mutations: Partial<MutationRecord>[]) => void;

global.MutationObserver = jest.fn((callback) => {
  mutationCallback = callback;
  return { observe: mockObserve, disconnect: mockDisconnect };
}) as any;

// Mock Chrome APIs
global.chrome = {
  runtime: { sendMessage: jest.fn() },
} as any;

const createMockMutation = (
  nodes: Node[],
  type: 'addedNodes' | 'removedNodes' = 'addedNodes'
): Partial<MutationRecord>[] => {
  return [{
    type: 'childList',
    addedNodes: type === 'addedNodes' ? nodes : [],
    removedNodes: type === 'removedNodes' ? nodes : [],
  }];
};


describe('ExtractionManager Unit Tests', () => {
  let manager: ExtractionManager;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new ExtractionManager();
  });

  describe('Initialization', () => {
    it('should create a FormExtractor instance', () => {
      expect(FormExtractor).toHaveBeenCalledTimes(1);
    });

    it('should initialize and start a MutationObserver on document.body', () => {
      expect(global.MutationObserver).toHaveBeenCalledWith(expect.any(Function));
      expect(mockObserve).toHaveBeenCalledWith(document.body, expect.any(Object));
    });
  });

  describe('MutationObserver Behavior', () => {
    it('should trigger debounced extraction when a form element is added', () => {
      const mockExtractorInstance = (FormExtractor as jest.Mock).mock.instances[0];
      const extractSpy = mockExtractorInstance.extractFormSchema;

      mutationCallback(createMockMutation([document.createElement('input')]));
      
      expect(extractSpy).not.toHaveBeenCalled();
      jest.advanceTimersByTime(301);
      expect(extractSpy).toHaveBeenCalledTimes(1);
    });

    it('should ignore mutations that do not contain form elements', () => {
      const mockExtractorInstance = (FormExtractor as jest.Mock).mock.instances[0];
      const extractSpy = mockExtractorInstance.extractFormSchema;

      mutationCallback(createMockMutation([document.createElement('div')]));
      jest.advanceTimersByTime(301);

      expect(extractSpy).not.toHaveBeenCalled();
    });
  });

  describe('Lifecycle and Visibility', () => {
    it('should stop observing when destroy is called', () => {
      manager.destroy();
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });

    it('should stop observing when the page is hidden', () => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      manager.handleVisibilityChange();
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });
});