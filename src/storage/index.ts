import CryptoJS from 'crypto-js';
import { UserProfile, UserSettings, STORAGE_KEYS } from '../types';

/**
 * Encrypted storage module for Chrome Extension
 * Implements Task 2 from Phase 1: Encrypted Storage
 * All profile data is encrypted before storing in chrome.storage.local
 */

// Generate or retrieve encryption salt
async function getOrCreateSalt(): Promise<string> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.ENCRYPTION_SALT);
  
  if (result[STORAGE_KEYS.ENCRYPTION_SALT]) {
    return result[STORAGE_KEYS.ENCRYPTION_SALT];
  }
  
  // Generate new salt
  const salt = CryptoJS.lib.WordArray.random(256/8).toString();
  await chrome.storage.local.set({ [STORAGE_KEYS.ENCRYPTION_SALT]: salt });
  return salt;
}

// Derive key from passphrase and salt
function deriveKey(passphrase: string, salt: string): string {
  return CryptoJS.PBKDF2(passphrase, salt, {
    keySize: 256/32,
    iterations: 10000
  }).toString();
}

/**
 * Save encrypted profile to chrome.storage.local
 * @param profileObject - User profile data to encrypt and store
 * @param passphrase - User's encryption passphrase
 */
export async function saveProfile(
  profileObject: UserProfile, 
  passphrase: string
): Promise<void> {
  try {
    const salt = await getOrCreateSalt();
    const key = deriveKey(passphrase, salt);
    
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(profileObject), 
      key
    ).toString();
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.PROFILE]: encrypted
    });
  } catch (error) {
    console.error('Failed to save profile:', error);
    throw new Error('Failed to encrypt and save profile data');
  }
}

/**
 * Load and decrypt profile from chrome.storage.local
 * @param passphrase - User's encryption passphrase
 * @returns Decrypted profile data or null if not found/invalid
 */
export async function loadProfile(passphrase: string): Promise<UserProfile | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.PROFILE);
    const encryptedData = result[STORAGE_KEYS.PROFILE];
    
    if (!encryptedData) {
      return null;
    }
    
    const salt = await getOrCreateSalt();
    const key = deriveKey(passphrase, salt);
    
    const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedString) {
      throw new Error('Invalid passphrase or corrupted data');
    }
    
    return JSON.parse(decryptedString) as UserProfile;
  } catch (error) {
    console.error('Failed to load profile:', error);
    return null;
  }
}

/**
 * Save user settings (with API key encryption)
 * @param settings - User settings to store
 * @param passphrase - Encryption passphrase for API key
 */
export async function saveSettings(
  settings: UserSettings, 
  passphrase?: string
): Promise<void> {
  try {
    const settingsToStore = { ...settings };
    
    // Encrypt API key if present and passphrase provided
    if (settings.apiKey && passphrase) {
      const salt = await getOrCreateSalt();
      const key = deriveKey(passphrase, salt);
      settingsToStore.apiKey = CryptoJS.AES.encrypt(settings.apiKey, key).toString();
    }
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: settingsToStore
    });
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw new Error('Failed to save settings');
  }
}

/**
 * Load user settings (with API key decryption)
 * @param passphrase - Decryption passphrase for API key
 * @returns User settings with decrypted API key
 */
export async function loadSettings(passphrase?: string): Promise<UserSettings | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const settings = result[STORAGE_KEYS.SETTINGS] as UserSettings;
    
    if (!settings) {
      return null;
    }
    
    // Decrypt API key if present and passphrase provided
    if (settings.apiKey && passphrase) {
      const salt = await getOrCreateSalt();
      const key = deriveKey(passphrase, salt);
      
      try {
        const decryptedBytes = CryptoJS.AES.decrypt(settings.apiKey, key);
        const decryptedApiKey = decryptedBytes.toString(CryptoJS.enc.Utf8);
        settings.apiKey = decryptedApiKey || undefined;
      } catch {
        // If decryption fails, remove the corrupted API key
        settings.apiKey = undefined;
      }
    }
    
    return settings;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return null;
  }
}

/**
 * Remove all stored data (profile and settings)
 */
export async function clearAllData(): Promise<void> {
  try {
    await chrome.storage.local.remove([
      STORAGE_KEYS.PROFILE,
      STORAGE_KEYS.SETTINGS,
      STORAGE_KEYS.ENCRYPTION_SALT
    ]);
  } catch (error) {
    console.error('Failed to clear data:', error);
    throw new Error('Failed to clear stored data');
  }
}

/**
 * Check if profile exists in storage
 */
export async function hasProfile(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.PROFILE);
    return !!result[STORAGE_KEYS.PROFILE];
  } catch {
    return false;
  }
}