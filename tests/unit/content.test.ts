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

describe('Content Script', () => {
  beforeEach(() => {
    mockLoggerInfo.mockClear();
    mockLoggerDebug.mockClear();
    mockLoggerWarn.mockClear();
    mockLoggerError.mockClear();
  });

  it('should load content script', () => {
    // Import the content script to ensure it loads without errors
    require('../../src/content/index');
    
    expect(mockLoggerInfo).toHaveBeenCalledWith('Job Application Co-Pilot: Content script loaded and ready');
  });

  it('should not throw errors during initialization', () => {
    expect(() => {
      require('../../src/content/index');
    }).not.toThrow();
  });
});