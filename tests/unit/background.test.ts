import { Logger } from '../../src/utils';
import { ExtractedFormSchema, UserProfile } from '../../src/types';

// Mock the Logger module
jest.mock('../../src/utils', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock the mapping engine
jest.mock('../../src/background/mapping-engine', () => ({
  MappingEngine: jest.fn().mockImplementation(() => ({
    mapFormFields: jest.fn(),
    getAvailableAdapters: jest.fn().mockReturnValue(['Greenhouse', 'Workday']),
  })),
  DEFAULT_MAPPING_CONFIG: {}
}));

const mockLoggerInfo = jest.fn();
const mockLoggerDebug = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

// Mock Chrome APIs
const mockChromeStorageGet = jest.fn();
const mockChromeStorageSet = jest.fn();
const mockChromeTabsSendMessage = jest.fn();
const mockOnMessageAddListener = jest.fn();
const mockOnInstalledAddListener = jest.fn();
const mockOnStartupAddListener = jest.fn();

// Re-mock the Logger to return our specific mock functions
jest.mocked(Logger).mockImplementation(() => ({
  info: mockLoggerInfo,
  debug: mockLoggerDebug,
  warn: mockLoggerWarn,
  error: mockLoggerError,
}));

describe('Background Service Worker', () => {
  beforeAll(() => {
    // Set up Chrome API mocks before any imports
    global.chrome = {
      storage: {
        local: {
          get: mockChromeStorageGet,
          set: mockChromeStorageSet,
        },
      },
      runtime: {
        onMessage: {
          addListener: mockOnMessageAddListener,
        },
        onInstalled: {
          addListener: mockOnInstalledAddListener,
        },
        onStartup: {
          addListener: mockOnStartupAddListener,
        },
      },
      tabs: {
        sendMessage: mockChromeTabsSendMessage,
      },
    } as any;
  });

  beforeEach(() => {
    // Clear all mocks but keep the chrome global setup
    jest.clearAllMocks();
  });

  it('should load background script', () => {
    // Import the background script to ensure it loads without errors
    require('../../src/background/index');
    
    expect(mockLoggerInfo).toHaveBeenCalledWith('Job Application Co-Pilot background script loaded');
    expect(mockLoggerDebug).toHaveBeenCalledWith('Available adapters:', ['Greenhouse', 'Workday']);
  });

  it('should not throw errors during initialization', () => {
    expect(() => {
      require('../../src/background/index');
    }).not.toThrow();
  });

  it('should register Chrome event listeners', () => {
    // Clear mocks to track new calls
    jest.clearAllMocks();
    
    // Delete the module from cache to force re-execution
    delete require.cache[require.resolve('../../src/background/index')];
    
    require('../../src/background/index');
    
    expect(mockOnMessageAddListener).toHaveBeenCalled();
    expect(mockOnInstalledAddListener).toHaveBeenCalled();
    expect(mockOnStartupAddListener).toHaveBeenCalled();
  });

  it('should set up default configuration on install', async () => {
    // Clear mocks and set up specific expectations
    jest.clearAllMocks();
    mockChromeStorageGet.mockResolvedValue({});
    
    // Delete the module from cache to force re-execution
    delete require.cache[require.resolve('../../src/background/index')];
    
    require('../../src/background/index');
    
    // Ensure we have the listener registered
    expect(mockOnInstalledAddListener).toHaveBeenCalled();
    
    // Get the onInstalled listener and call it with install reason
    const onInstalledCallback = mockOnInstalledAddListener.mock.calls[0][0];
    await onInstalledCallback({ reason: 'install' });
    
    expect(mockChromeStorageSet).toHaveBeenCalledWith({
      user_profile: JSON.stringify([])
    });
    expect(mockChromeStorageSet).toHaveBeenCalledWith({
      user_settings: JSON.stringify({
        llmProvider: 'ollama',
        enableTelemetry: false,
        enableFeedback: true
      })
    });
  });
});