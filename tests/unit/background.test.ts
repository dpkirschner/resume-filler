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
    
    // Load the background script ONCE after mocks are set up
    require('../../src/background/index');
  });

  beforeEach(() => {
    // Clear specific mocks but preserve chrome listener registration calls
    mockChromeStorageGet.mockClear();
    mockChromeStorageSet.mockClear(); 
    mockChromeTabsSendMessage.mockClear();
    // Note: We don't clear the addListener mocks because we need to preserve
    // the calls from when the background script was initially loaded
  });

  it('should load background script', () => {
    // Import the background script to ensure it loads without errors
    require('../../src/background/index');
    
    expect(mockLoggerInfo).toHaveBeenCalledWith('Job Application Co-Pilot background script loaded');
    expect(mockLoggerDebug).toHaveBeenCalledWith('Available adapters:', ['Greenhouse', 'Workday']);
  });

  it('should not throw errors during initialization', () => {
    // Background script was already loaded successfully in beforeAll
    expect(global.chrome).toBeDefined();
    expect(global.chrome.runtime.onMessage.addListener).toBe(mockOnMessageAddListener);
  });

  it('should register Chrome event listeners', () => {
    // Background script was loaded in beforeAll, verify listeners were registered
    expect(mockOnMessageAddListener).toHaveBeenCalled();
    expect(mockOnInstalledAddListener).toHaveBeenCalled();
    expect(mockOnStartupAddListener).toHaveBeenCalled();
  });

  it('should set up default configuration on install', async () => {
    // Clear storage mocks but preserve listener registration calls
    mockChromeStorageGet.mockClear();
    mockChromeStorageSet.mockClear();
    
    // Mock storage.get to return empty object (no existing user_profile)
    mockChromeStorageGet.mockResolvedValue({});
    
    // Ensure we have the listener registered (from beforeAll)
    expect(mockOnInstalledAddListener).toHaveBeenCalled();
    
    // Get the onInstalled listener and call it with install reason
    const onInstalledCallback = mockOnInstalledAddListener.mock.calls[0][0];
    await onInstalledCallback({ reason: 'install' });
    
    // Verify chrome.storage.local.get was called to check for existing profile
    expect(mockChromeStorageGet).toHaveBeenCalledWith('user_profile');
    
    // Should set user_profile since none exists, and user_settings
    expect(mockChromeStorageSet).toHaveBeenCalledWith({
      user_profile: JSON.stringify([])
    });
  });
});