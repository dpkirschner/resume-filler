import { Logger } from '../../src/utils';

// Mock the Logger module
jest.mock('../../src/utils', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

const mockLoggerInfo = jest.fn();
const mockLoggerDebug = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

// Re-mock the Logger to return our specific mock functions
jest.mocked(Logger).mockImplementation(() => ({
  info: mockLoggerInfo,
  debug: mockLoggerDebug,
  warn: mockLoggerWarn,
  error: mockLoggerError,
}));

describe('Background Service Worker', () => {
  beforeEach(() => {
    mockLoggerInfo.mockClear();
    mockLoggerDebug.mockClear();
    mockLoggerWarn.mockClear();
    mockLoggerError.mockClear();
  });

  it('should load background script', () => {
    // Import the background script to ensure it loads without errors
    require('../../src/background/index');
    
    expect(mockLoggerInfo).toHaveBeenCalledWith('Job Application Co-Pilot background script loaded');
  });

  it('should not throw errors during initialization', () => {
    expect(() => {
      require('../../src/background/index');
    }).not.toThrow();
  });
});