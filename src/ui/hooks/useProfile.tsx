import { useState, useCallback, useEffect } from 'react';
import { UserProfile, ProfileField } from '../../types';
import { saveProfile, loadProfile, hasProfile } from '../../storage';
import { Logger } from '../../utils';

const logger = new Logger('useProfile');

export interface UseProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  hasExistingProfile: boolean;
  addField: (field: Omit<ProfileField, 'label'> & { label: string }) => Promise<UserProfile>;
  updateField: (index: number, field: Partial<ProfileField>) => Promise<UserProfile>;
  removeField: (index: number) => Promise<UserProfile>;
  loadProfileData: (passphrase: string) => Promise<boolean>;
  saveProfileData: (passphrase: string, profileOverride?: UserProfile) => Promise<void>;
  clearProfile: () => Promise<void>;
}

/**
 * Custom hook for managing user profile data with encryption
 * Inspired by useLocalStorage patterns from usehooks-ts but adapted for Chrome storage
 */
export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);

  // Check if profile exists on mount
  useEffect(() => {
    const checkProfile = async () => {
      const exists = await hasProfile();
      setHasExistingProfile(exists);
    };
    checkProfile();
  }, []);

  const loadProfileData = useCallback(async (passphrase: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const loadedProfile = await loadProfile(passphrase);
      if (loadedProfile) {
        setProfile(loadedProfile);
        return true;
      } else {
        setError('Invalid passphrase or no profile found');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profile';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveProfileData = useCallback(async (passphrase: string, profileOverride?: UserProfile): Promise<void> => {
    console.log('[useProfile] saveProfileData called');
    
    setIsLoading(true);
    setError(null);

    try {
      // Use profileOverride if provided, otherwise use current profile state
      const profileToSave = profileOverride !== undefined ? profileOverride : (profile || []);
      
      if (profileOverride !== undefined) {
        console.log('[useProfile] Using provided profile override to avoid closure issues');
      }
      
      console.log('[useProfile] Current profile state:', {
        profileExists: !!profileToSave,
        fieldCount: profileToSave?.length || 0,
        fields: profileToSave?.map(f => ({ label: f.label, type: f.type })) || []
      });
      
      console.log('[useProfile] About to save profile:', {
        fieldCount: profileToSave.length,
        fields: profileToSave.map(f => ({ label: f.label, type: f.type, hasValue: !!f.value }))
      });
      
      await saveProfile(profileToSave, passphrase);
      console.log('[useProfile] Profile saved successfully to storage');
      
      // Update state if we're initializing for the first time
      if (!profile && !profileOverride) {
        setProfile(profileToSave);
        console.log('[useProfile] Initialized profile state for first time');
      }
      
      setHasExistingProfile(true);
      console.log('[useProfile] saveProfileData completed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save profile';
      console.error('[useProfile] saveProfileData failed:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  const addField = useCallback(async (field: Omit<ProfileField, 'label'> & { label: string }): Promise<UserProfile> => {
    console.log('[useProfile] addField called:', { label: field.label, type: field.type });
    
    const newField: ProfileField = {
      ...field,
      label: field.label.trim()
    };

    if (!newField.label) {
      throw new Error('Field label is required');
    }

    // Get current profile for validation
    const currentProfile = profile || [];
    console.log('[useProfile] Current profile before adding field:', {
      fieldCount: currentProfile.length,
      existingLabels: currentProfile.map(f => f.label)
    });
    
    const existingLabels = currentProfile.map(f => f.label.toLowerCase());
    if (existingLabels.includes(newField.label.toLowerCase())) {
      throw new Error('A field with this label already exists');
    }

    const newProfile = [...currentProfile, newField];
    console.log('[useProfile] Profile updated after addField:', {
      fieldCount: newProfile.length,
      newFieldLabel: newField.label,
      allLabels: newProfile.map(f => f.label)
    });

    setProfile(newProfile);
    console.log('[useProfile] ✅ Field added to state - returning updated profile for immediate save');
    return newProfile;
  }, [profile]);

  const updateField = useCallback(async (index: number, fieldUpdates: Partial<ProfileField>): Promise<UserProfile> => {
    console.log('[useProfile] updateField called:', { index, updates: fieldUpdates });
    
    if (!profile || index < 0 || index >= profile.length) {
      throw new Error('Invalid field index');
    }

    console.log('[useProfile] Current field before update:', profile[index]);

    // If updating label, check for duplicates
    if (fieldUpdates.label) {
      const trimmedLabel = fieldUpdates.label.trim();
      if (!trimmedLabel) {
        throw new Error('Field label cannot be empty');
      }

      const existingLabels = profile
        .map((f, i) => i !== index ? f.label.toLowerCase() : null)
        .filter(Boolean);
      
      if (existingLabels.includes(trimmedLabel.toLowerCase())) {
        throw new Error('A field with this label already exists');
      }
    }

    const newProfile = [...profile];
    const oldField = newProfile[index];
    newProfile[index] = {
      ...newProfile[index],
      ...fieldUpdates,
      ...(fieldUpdates.label && { label: fieldUpdates.label.trim() })
    };

    console.log('[useProfile] Field updated:', {
      index,
      oldField,
      newField: newProfile[index],
      profileLength: newProfile.length
    });

    setProfile(newProfile);
    console.log('[useProfile] ✅ Field updated in state - returning updated profile for immediate save');
    return newProfile;
  }, [profile]);

  const removeField = useCallback(async (index: number): Promise<UserProfile> => {
    console.log('[useProfile] removeField called:', { index });
    
    if (!profile || index < 0 || index >= profile.length) {
      throw new Error('Invalid field index');
    }

    const fieldToRemove = profile[index];
    console.log('[useProfile] Removing field:', fieldToRemove);

    const newProfile = [...profile];
    newProfile.splice(index, 1);
    console.log('[useProfile] Field removed:', {
      removedField: fieldToRemove,
      newFieldCount: newProfile.length
    });

    setProfile(newProfile);
    console.log('[useProfile] ✅ Field removed from state - returning updated profile for immediate save');
    return newProfile;
  }, [profile]);

  const clearProfile = useCallback(async () => {
    logger.info('clearProfile called - signing out');
    logger.debug('Current profile state before clearing:', {
      profileExists: !!profile,
      fieldCount: profile?.length || 0,
      fields: profile?.map(f => ({ label: f.label, type: f.type })) || []
    });
    
    setProfile(null);
    setError(null);
    logger.info('Profile state cleared from memory');
    
    // Re-check if profile exists in storage (sign out doesn't delete encrypted data)
    try {
      const exists = await hasProfile();
      setHasExistingProfile(exists);
      logger.debug('Profile existence check after clearProfile:', { exists });
    } catch (error) {
      // If storage check fails, default to false for safety
      logger.error('Failed to check profile existence after clear:', error);
      setHasExistingProfile(false);
    }
    
    logger.warn('⚠️  Profile cleared from memory - any unsaved changes are LOST!');
  }, [profile]);

  return {
    profile,
    isLoading,
    error,
    hasExistingProfile,
    addField,
    updateField, 
    removeField,
    loadProfileData,
    saveProfileData,
    clearProfile
  };
}