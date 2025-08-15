import { 
  saveProfile, 
  loadProfile, 
  saveSettings, 
  loadSettings, 
  clearAllData, 
  hasProfile 
} from '../../src/storage';
import { UserProfile, UserSettings, STORAGE_KEYS } from '../../src/types';

// Mock crypto-js with more realistic behavior
jest.mock('crypto-js', () => ({
  lib: {
    WordArray: {
      random: jest.fn().mockReturnValue({ toString: () => 'mock-salt' })
    }
  },
  PBKDF2: jest.fn().mockReturnValue({ toString: () => 'mock-key' }),
  AES: {
    encrypt: jest.fn(),
    decrypt: jest.fn()
  },
  enc: {
    Utf8: 'mock-utf8'
  }
}));

import CryptoJS from 'crypto-js';
const mockCrypto = CryptoJS as jest.Mocked<typeof CryptoJS>;

// Mock chrome.storage.local
const mockStorage: Record<string, any> = {};

const mockChromeStorage = {
  local: {
    get: jest.fn((keys: string | string[]) => {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      const result: Record<string, any> = {};
      keysArray.forEach(key => {
        if (mockStorage[key]) {
          result[key] = mockStorage[key];
        }
      });
      return Promise.resolve(result);
    }),
    set: jest.fn((items: Record<string, any>) => {
      Object.assign(mockStorage, items);
      return Promise.resolve();
    }),
    remove: jest.fn((keys: string | string[]) => {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach(key => delete mockStorage[key]);
      return Promise.resolve();
    }),
  },
};

// Replace the global chrome object
(global as any).chrome = { storage: mockChromeStorage };

describe('Storage Module', () => {
  const mockProfile: UserProfile = [
    {
      label: 'Full Name',
      value: 'John Doe',
      type: 'personal',
      isSensitive: false,
    },
    {
      label: 'Email',
      value: 'john@example.com',
      type: 'personal',
      isSensitive: false,
    },
    {
      label: 'Phone',
      value: '+1-555-0123',
      type: 'personal',
      isSensitive: true,
    },
  ];

  const mockSettings: UserSettings = {
    llmProvider: 'openai',
    apiKey: 'sk-test-key-123',
    enableTelemetry: true,
    enableFeedback: false,
  };

  const testPassphrase = 'TestPassword123!';

  beforeEach(() => {
    // Clear mock storage and reset mocks
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    jest.clearAllMocks();
    
    // Set up crypto mocks with more realistic behavior
    mockCrypto.AES.encrypt.mockImplementation((data: string) => ({
      toString: () => `encrypted_${btoa(data)}`
    }));
    
    mockCrypto.AES.decrypt.mockImplementation((encryptedData: string) => ({
      toString: () => {
        if (encryptedData === 'corrupted-data' || encryptedData === 'corrupted-encrypted-key') {
          return ''; // Simulate corrupted data
        }
        // Extract original data from our mock encryption
        if (encryptedData.startsWith('encrypted_')) {
          try {
            return atob(encryptedData.substring(10));
          } catch {
            return '';
          }
        }
        return JSON.stringify(mockProfile); // Default fallback
      }
    }));
  });

  describe('Profile Management', () => {
    describe('saveProfile', () => {
      it('should encrypt and save profile data', async () => {
        await saveProfile(mockProfile, testPassphrase);

        expect(mockChromeStorage.local.set).toHaveBeenCalledTimes(2); // Salt + Profile
        expect(mockStorage[STORAGE_KEYS.PROFILE]).toBeDefined();
        expect(mockStorage[STORAGE_KEYS.ENCRYPTION_SALT]).toBeDefined();
        
        // Verify data is encrypted (not plain JSON)
        expect(mockStorage[STORAGE_KEYS.PROFILE]).not.toEqual(JSON.stringify(mockProfile));
      });

      it('should generate encryption salt on first use', async () => {
        expect(mockStorage[STORAGE_KEYS.ENCRYPTION_SALT]).toBeUndefined();
        
        await saveProfile(mockProfile, testPassphrase);
        
        expect(mockStorage[STORAGE_KEYS.ENCRYPTION_SALT]).toBeDefined();
        expect(typeof mockStorage[STORAGE_KEYS.ENCRYPTION_SALT]).toBe('string');
      });

      it('should reuse existing salt', async () => {
        // First save
        await saveProfile(mockProfile, testPassphrase);
        const firstSalt = mockStorage[STORAGE_KEYS.ENCRYPTION_SALT];

        // Second save
        await saveProfile(mockProfile, testPassphrase);
        const secondSalt = mockStorage[STORAGE_KEYS.ENCRYPTION_SALT];

        expect(firstSalt).toEqual(secondSalt);
      });

      it('should handle encryption errors gracefully', async () => {
        // Mock chrome storage to throw an error
        mockChromeStorage.local.set.mockRejectedValueOnce(new Error('Storage failed'));

        await expect(saveProfile(mockProfile, testPassphrase))
          .rejects.toThrow('Failed to encrypt and save profile data');

        // Reset mock
        mockChromeStorage.local.set.mockImplementation((items: Record<string, any>) => {
          Object.assign(mockStorage, items);
          return Promise.resolve();
        });
      });
    });

    describe('loadProfile', () => {
      beforeEach(async () => {
        // Set up encrypted profile data
        await saveProfile(mockProfile, testPassphrase);
      });

      it('should decrypt and return profile data with correct passphrase', async () => {
        const loadedProfile = await loadProfile(testPassphrase);

        expect(loadedProfile).toEqual(mockProfile);
      });

      it('should return null with incorrect passphrase', async () => {
        // Mock decrypt to return empty string (invalid passphrase)
        mockCrypto.AES.decrypt.mockReturnValueOnce({ 
          toString: jest.fn().mockReturnValue('')
        });

        const loadedProfile = await loadProfile('wrongpassphrase');

        expect(loadedProfile).toBeNull();
      });

      it('should return null when no profile exists', async () => {
        // Clear the profile data
        delete mockStorage[STORAGE_KEYS.PROFILE];

        const loadedProfile = await loadProfile(testPassphrase);

        expect(loadedProfile).toBeNull();
      });

      it('should handle corrupted data gracefully', async () => {
        // Set corrupted encrypted data
        mockStorage[STORAGE_KEYS.PROFILE] = 'corrupted-data';

        const loadedProfile = await loadProfile(testPassphrase);

        expect(loadedProfile).toBeNull();
      });
    });
  });

  describe('Settings Management', () => {
    describe('saveSettings', () => {
      it('should save settings without API key encryption when no passphrase provided', async () => {
        const settingsWithoutApiKey = { ...mockSettings };
        delete settingsWithoutApiKey.apiKey;

        await saveSettings(settingsWithoutApiKey);

        expect(mockStorage[STORAGE_KEYS.SETTINGS]).toEqual(settingsWithoutApiKey);
      });

      it('should encrypt API key when passphrase is provided', async () => {
        await saveSettings(mockSettings, testPassphrase);

        const savedSettings = mockStorage[STORAGE_KEYS.SETTINGS];
        expect(savedSettings.apiKey).toBeDefined();
        expect(savedSettings.apiKey).not.toEqual(mockSettings.apiKey);
        
        // Other fields should remain unchanged
        expect(savedSettings.llmProvider).toEqual(mockSettings.llmProvider);
        expect(savedSettings.enableTelemetry).toEqual(mockSettings.enableTelemetry);
      });

      it('should save settings without encrypting API key when no passphrase provided', async () => {
        await saveSettings(mockSettings);

        const savedSettings = mockStorage[STORAGE_KEYS.SETTINGS];
        expect(savedSettings).toEqual(mockSettings);
      });
    });

    describe('loadSettings', () => {
      it('should load settings and decrypt API key with correct passphrase', async () => {
        await saveSettings(mockSettings, testPassphrase);

        const loadedSettings = await loadSettings(testPassphrase);

        expect(loadedSettings).toEqual(mockSettings);
      });

      it('should load settings without decrypting API key when no passphrase provided', async () => {
        await saveSettings(mockSettings, testPassphrase);

        const loadedSettings = await loadSettings();

        // API key should remain encrypted when no passphrase provided
        expect(loadedSettings?.llmProvider).toEqual(mockSettings.llmProvider);
        expect(loadedSettings?.enableTelemetry).toEqual(mockSettings.enableTelemetry);
        expect(loadedSettings?.enableFeedback).toEqual(mockSettings.enableFeedback);
        expect(loadedSettings?.apiKey).toBeDefined();
        expect(loadedSettings?.apiKey).not.toEqual(mockSettings.apiKey); // Should be encrypted
        expect(loadedSettings?.apiKey).toMatch(/^encrypted_/); // Should match our mock encryption format
      });

      it('should return null when no settings exist', async () => {
        const loadedSettings = await loadSettings();

        expect(loadedSettings).toBeNull();
      });

      it('should handle corrupted API key gracefully', async () => {
        // Save settings with encrypted API key
        await saveSettings(mockSettings, testPassphrase);
        
        // Corrupt the API key
        const settings = mockStorage[STORAGE_KEYS.SETTINGS];
        settings.apiKey = 'corrupted-encrypted-key';
        mockStorage[STORAGE_KEYS.SETTINGS] = settings;

        const loadedSettings = await loadSettings(testPassphrase);

        expect(loadedSettings?.apiKey).toBeUndefined();
        expect(loadedSettings?.llmProvider).toEqual(mockSettings.llmProvider);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('hasProfile', () => {
      it('should return true when profile exists', async () => {
        await saveProfile(mockProfile, testPassphrase);

        const exists = await hasProfile();

        expect(exists).toBe(true);
      });

      it('should return false when no profile exists', async () => {
        const exists = await hasProfile();

        expect(exists).toBe(false);
      });

      it('should handle storage errors gracefully', async () => {
        // Mock storage.get to throw error
        mockChromeStorage.local.get.mockRejectedValueOnce(new Error('Storage error'));

        const exists = await hasProfile();

        expect(exists).toBe(false);
      });
    });

    describe('clearAllData', () => {
      it('should remove all stored data', async () => {
        // Set up some data
        await saveProfile(mockProfile, testPassphrase);
        await saveSettings(mockSettings, testPassphrase);

        expect(mockStorage[STORAGE_KEYS.PROFILE]).toBeDefined();
        expect(mockStorage[STORAGE_KEYS.SETTINGS]).toBeDefined();
        expect(mockStorage[STORAGE_KEYS.ENCRYPTION_SALT]).toBeDefined();

        await clearAllData();

        expect(mockStorage[STORAGE_KEYS.PROFILE]).toBeUndefined();
        expect(mockStorage[STORAGE_KEYS.SETTINGS]).toBeUndefined();
        expect(mockStorage[STORAGE_KEYS.ENCRYPTION_SALT]).toBeUndefined();
      });

      it('should handle storage removal errors gracefully', async () => {
        mockChromeStorage.local.remove.mockRejectedValueOnce(new Error('Remove failed'));

        await expect(clearAllData()).rejects.toThrow('Failed to clear stored data');
      });
    });
  });
});