import { renderHook, act } from '@testing-library/react';
import { useProfile } from '../../src/ui/hooks/useProfile';
import { UserProfile, ProfileField } from '../../src/types';
import * as storage from '../../src/storage';

// Mock the storage module
jest.mock('../../src/storage');
const mockStorage = storage as jest.Mocked<typeof storage>;

describe('useProfile Hook', () => {
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
  ];

  const testPassphrase = 'TestPassword123!';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockStorage.hasProfile.mockResolvedValue(false);
    mockStorage.loadProfile.mockResolvedValue(null);
    mockStorage.saveProfile.mockResolvedValue(undefined);
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useProfile());

      expect(result.current.profile).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.hasExistingProfile).toBe(false);
    });

    it('should check for existing profile on mount', async () => {
      mockStorage.hasProfile.mockResolvedValue(true);

      renderHook(() => useProfile());

      // Wait for useEffect to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockStorage.hasProfile).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadProfileData', () => {
    it('should load profile successfully with valid passphrase', async () => {
      mockStorage.loadProfile.mockResolvedValue(mockProfile);
      const { result } = renderHook(() => useProfile());

      let loadResult: boolean;
      await act(async () => {
        loadResult = await result.current.loadProfileData(testPassphrase);
      });

      expect(loadResult!).toBe(true);
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockStorage.loadProfile).toHaveBeenCalledWith(testPassphrase);
    });

    it('should handle invalid passphrase gracefully', async () => {
      mockStorage.loadProfile.mockResolvedValue(null);
      const { result } = renderHook(() => useProfile());

      let loadResult: boolean;
      await act(async () => {
        loadResult = await result.current.loadProfileData('wrongpassphrase');
      });

      expect(loadResult!).toBe(false);
      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBe('Invalid passphrase or no profile found');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle storage errors', async () => {
      const errorMessage = 'Storage error occurred';
      mockStorage.loadProfile.mockRejectedValue(new Error(errorMessage));
      const { result } = renderHook(() => useProfile());

      let loadResult: boolean;
      await act(async () => {
        loadResult = await result.current.loadProfileData(testPassphrase);
      });

      expect(loadResult!).toBe(false);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during operation', async () => {
      let resolvePromise: (value: UserProfile | null) => void;
      const loadPromise = new Promise<UserProfile | null>(resolve => {
        resolvePromise = resolve;
      });
      mockStorage.loadProfile.mockReturnValue(loadPromise);

      const { result } = renderHook(() => useProfile());

      act(() => {
        result.current.loadProfileData(testPassphrase);
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!(mockProfile);
        await loadPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('saveProfileData', () => {
    it('should save profile successfully', async () => {
      // Set up mock to return profile data for this test
      mockStorage.loadProfile.mockResolvedValueOnce(mockProfile);
      
      const { result } = renderHook(() => useProfile());

      // Load profile first to have data to save
      await act(async () => {
        await result.current.loadProfileData(testPassphrase);
      });

      // Verify profile was loaded
      expect(result.current.profile).toEqual(mockProfile);

      await act(async () => {
        await result.current.saveProfileData(testPassphrase);
      });

      expect(mockStorage.saveProfile).toHaveBeenCalledWith(mockProfile, testPassphrase);
      expect(result.current.hasExistingProfile).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should throw error when no profile data exists', async () => {
      const { result } = renderHook(() => useProfile());

      await act(async () => {
        await expect(result.current.saveProfileData(testPassphrase))
          .rejects.toThrow('No profile data to save');
      });
    });

    it('should handle save errors', async () => {
      const errorMessage = 'Save failed';
      mockStorage.saveProfile.mockRejectedValue(new Error(errorMessage));
      mockStorage.loadProfile.mockResolvedValue(mockProfile);

      const { result } = renderHook(() => useProfile());

      await act(async () => {
        await result.current.loadProfileData(testPassphrase);
      });

      await act(async () => {
        await expect(result.current.saveProfileData(testPassphrase))
          .rejects.toThrow(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('Profile Field Management', () => {
    beforeEach(() => {
      // Set up mock to return profile data for these tests
      mockStorage.loadProfile.mockResolvedValue(mockProfile);
    });

    describe('addField', () => {
      it('should add new field successfully', async () => {
        const { result } = renderHook(() => useProfile());

        // Load profile first to have data to work with
        await act(async () => {
          await result.current.loadProfileData(testPassphrase);
        });

        const newField: Omit<ProfileField, 'label'> & { label: string } = {
          label: 'Phone Number',
          value: '+1-555-0123',
          type: 'personal',
          isSensitive: true,
        };

        await act(async () => {
          await result.current.addField(newField);
        });

        expect(result.current.profile).toHaveLength(mockProfile.length + 1);
        expect(result.current.profile?.[mockProfile.length]).toEqual(newField);
      });

      it('should reject empty field labels', async () => {
        const { result } = renderHook(() => useProfile());

        const newField = {
          label: '   ', // Empty after trim
          value: 'test',
          type: 'personal' as const,
          isSensitive: false,
        };

        await act(async () => {
          await expect(result.current.addField(newField))
            .rejects.toThrow('Field label is required');
        });
      });

      it('should reject duplicate field labels', async () => {
        const { result } = renderHook(() => useProfile());

        await act(async () => {
          await result.current.loadProfileData(testPassphrase);
        });

        const duplicateField = {
          label: 'Full Name', // Already exists in mockProfile
          value: 'Jane Doe',
          type: 'personal' as const,
          isSensitive: false,
        };

        await act(async () => {
          await expect(result.current.addField(duplicateField))
            .rejects.toThrow('A field with this label already exists');
        });
      });

      it('should trim field labels', async () => {
        const { result } = renderHook(() => useProfile());

        await act(async () => {
          await result.current.loadProfileData(testPassphrase);
        });

        const newField = {
          label: '  Phone Number  ',
          value: '+1-555-0123',
          type: 'personal' as const,
          isSensitive: true,
        };

        await act(async () => {
          await result.current.addField(newField);
        });

        expect(result.current.profile?.[mockProfile.length]?.label).toBe('Phone Number');
      });
    });

    describe('updateField', () => {
      it('should update field successfully', async () => {
        const { result } = renderHook(() => useProfile());

        await act(async () => {
          await result.current.loadProfileData(testPassphrase);
        });

        const updates = { value: 'Jane Doe' };

        await act(async () => {
          await result.current.updateField(0, updates);
        });

        expect(result.current.profile?.[0]?.value).toBe('Jane Doe');
        expect(result.current.profile?.[0]?.label).toBe(mockProfile[0].label); // Other fields unchanged
      });

      it('should handle invalid field index', async () => {
        const { result } = renderHook(() => useProfile());

        await act(async () => {
          await result.current.loadProfileData(testPassphrase);
        });

        await act(async () => {
          await expect(result.current.updateField(999, { value: 'test' }))
            .rejects.toThrow('Invalid field index');
        });
      });

      it('should validate label updates for duplicates', async () => {
        const { result } = renderHook(() => useProfile());

        await act(async () => {
          await result.current.loadProfileData(testPassphrase);
        });

        // Try to update second field with first field's label
        await act(async () => {
          await expect(result.current.updateField(1, { label: 'Full Name' }))
            .rejects.toThrow('A field with this label already exists');
        });
      });

      it('should reject empty label updates', async () => {
        const { result } = renderHook(() => useProfile());

        await act(async () => {
          await result.current.loadProfileData(testPassphrase);
        });

        await act(async () => {
          await expect(result.current.updateField(0, { label: '   ' }))
            .rejects.toThrow('Field label cannot be empty');
        });
      });
    });

    describe('removeField', () => {
      it('should remove field successfully', async () => {
        const { result } = renderHook(() => useProfile());

        await act(async () => {
          await result.current.loadProfileData(testPassphrase);
        });

        await act(async () => {
          await result.current.removeField(0);
        });

        expect(result.current.profile).toHaveLength(mockProfile.length - 1);
        expect(result.current.profile?.[0]?.label).toBe(mockProfile[1].label);
      });

      it('should handle invalid field index', async () => {
        const { result } = renderHook(() => useProfile());

        await act(async () => {
          await result.current.loadProfileData(testPassphrase);
        });

        await act(async () => {
          await expect(result.current.removeField(999))
            .rejects.toThrow('Invalid field index');
        });
      });
    });
  });

  describe('clearProfile', () => {
    it('should clear all profile state', async () => {
      // Set up mock to return profile data for this test
      mockStorage.loadProfile.mockResolvedValueOnce(mockProfile);
      
      const { result } = renderHook(() => useProfile());

      // Load profile first to have something to clear
      await act(async () => {
        await result.current.loadProfileData(testPassphrase);
      });

      // Verify profile was loaded
      expect(result.current.profile).toEqual(mockProfile);

      act(() => {
        result.current.clearProfile();
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.hasExistingProfile).toBe(false);
    });
  });
});