import { useState, useCallback, useEffect } from 'react';
import { UserProfile, ProfileField } from '../../types';
import { saveProfile, loadProfile, hasProfile } from '../../storage';

export interface UseProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  hasExistingProfile: boolean;
  addField: (field: Omit<ProfileField, 'label'> & { label: string }) => Promise<void>;
  updateField: (index: number, field: Partial<ProfileField>) => Promise<void>;
  removeField: (index: number) => Promise<void>;
  loadProfileData: (passphrase: string) => Promise<boolean>;
  saveProfileData: (passphrase: string) => Promise<void>;
  clearProfile: () => void;
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

  const saveProfileData = useCallback(async (passphrase: string): Promise<void> => {
    if (!profile) {
      throw new Error('No profile data to save');
    }

    setIsLoading(true);
    setError(null);

    try {
      await saveProfile(profile, passphrase);
      setHasExistingProfile(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save profile';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  const addField = useCallback(async (field: Omit<ProfileField, 'label'> & { label: string }): Promise<void> => {
    const newField: ProfileField = {
      ...field,
      label: field.label.trim()
    };

    if (!newField.label) {
      throw new Error('Field label is required');
    }

    // Get current profile for validation
    const currentProfile = profile || [];
    const existingLabels = currentProfile.map(f => f.label.toLowerCase());
    if (existingLabels.includes(newField.label.toLowerCase())) {
      throw new Error('A field with this label already exists');
    }

    setProfile(currentProfile => {
      const newProfile = currentProfile ? [...currentProfile] : [];
      newProfile.push(newField);
      return newProfile;
    });
  }, [profile]);

  const updateField = useCallback(async (index: number, fieldUpdates: Partial<ProfileField>): Promise<void> => {
    if (!profile || index < 0 || index >= profile.length) {
      throw new Error('Invalid field index');
    }

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

    setProfile(currentProfile => {
      if (!currentProfile) return currentProfile;
      
      const newProfile = [...currentProfile];
      newProfile[index] = {
        ...newProfile[index],
        ...fieldUpdates,
        ...(fieldUpdates.label && { label: fieldUpdates.label.trim() })
      };

      return newProfile;
    });
  }, [profile]);

  const removeField = useCallback(async (index: number): Promise<void> => {
    if (!profile || index < 0 || index >= profile.length) {
      throw new Error('Invalid field index');
    }

    setProfile(currentProfile => {
      if (!currentProfile) return currentProfile;
      
      const newProfile = [...currentProfile];
      newProfile.splice(index, 1);
      return newProfile;
    });
  }, [profile]);

  const clearProfile = useCallback(() => {
    setProfile(null);
    setError(null);
    setHasExistingProfile(false);
  }, []);

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