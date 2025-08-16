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

    it('should create empty profile when no profile data exists (first-time setup)', async () => {
      const { result } = renderHook(() => useProfile());

      // Verify initial state is null
      expect(result.current.profile).toBeNull();
      expect(result.current.hasExistingProfile).toBe(false);

      await act(async () => {
        await result.current.saveProfileData(testPassphrase);
      });

      // Should save empty array and update state
      expect(mockStorage.saveProfile).toHaveBeenCalledWith([], testPassphrase);
      expect(result.current.profile).toEqual([]);
      expect(result.current.hasExistingProfile).toBe(true);
      expect(result.current.error).toBeNull();
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

    it('should handle save errors during first-time setup', async () => {
      const errorMessage = 'Storage initialization failed';
      mockStorage.saveProfile.mockRejectedValue(new Error(errorMessage));
      
      const { result } = renderHook(() => useProfile());

      await act(async () => {
        await expect(result.current.saveProfileData(testPassphrase))
          .rejects.toThrow(errorMessage);
      });

      // State should not be updated on failure
      expect(result.current.profile).toBeNull();
      expect(result.current.hasExistingProfile).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should set loading state during first-time profile creation', async () => {
      let resolvePromise: () => void;
      const savePromise = new Promise<void>(resolve => {
        resolvePromise = resolve;
      });
      mockStorage.saveProfile.mockReturnValue(savePromise);

      const { result } = renderHook(() => useProfile());

      act(() => {
        result.current.saveProfileData(testPassphrase);
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!();
        await savePromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should allow adding fields after first-time profile creation', async () => {
      const { result } = renderHook(() => useProfile());

      // Create empty profile first
      await act(async () => {
        await result.current.saveProfileData(testPassphrase);
      });

      expect(result.current.profile).toEqual([]);

      // Add a field to the empty profile
      const newField = {
        label: 'Full Name',
        value: 'John Doe',
        type: 'personal' as const,
        isSensitive: false,
      };

      await act(async () => {
        await result.current.addField(newField);
      });

      expect(result.current.profile).toHaveLength(1);
      expect(result.current.profile?.[0]).toEqual(newField);
    });
  });

  describe('First-Time Profile Setup Integration', () => {
    it('should complete full first-time setup workflow', async () => {
      const { result } = renderHook(() => useProfile());

      // 1. Initial state - no profile exists
      expect(result.current.profile).toBeNull();
      expect(result.current.hasExistingProfile).toBe(false);

      // 2. Create encrypted storage with empty profile
      await act(async () => {
        await result.current.saveProfileData(testPassphrase);
      });

      // 3. Verify profile was initialized
      expect(mockStorage.saveProfile).toHaveBeenCalledWith([], testPassphrase);
      expect(result.current.profile).toEqual([]);
      expect(result.current.hasExistingProfile).toBe(true);

      // 4. Add first field
      const firstField = {
        label: 'Full Name',
        value: 'John Doe',
        type: 'personal' as const,
        isSensitive: false,
      };

      await act(async () => {
        await result.current.addField(firstField);
      });

      expect(result.current.profile).toHaveLength(1);
      expect(result.current.profile?.[0]).toEqual(firstField);

      // 5. Add second field
      const secondField = {
        label: 'Email',
        value: 'john@example.com',
        type: 'contact' as const,
        isSensitive: false,
      };

      await act(async () => {
        await result.current.addField(secondField);
      });

      expect(result.current.profile).toHaveLength(2);
      expect(result.current.profile?.[1]).toEqual(secondField);

      // 6. Save updated profile
      await act(async () => {
        await result.current.saveProfileData(testPassphrase);
      });

      // Verify save was called with the complete profile
      expect(mockStorage.saveProfile).toHaveBeenLastCalledWith(
        [firstField, secondField],
        testPassphrase
      );
    });

    it('should handle mixed operations after first-time setup', async () => {
      const { result } = renderHook(() => useProfile());

      // Initialize empty profile
      await act(async () => {
        await result.current.saveProfileData(testPassphrase);
      });

      // Add some fields
      await act(async () => {
        await result.current.addField({
          label: 'Name',
          value: 'John',
          type: 'personal',
          isSensitive: false,
        });
      });

      await act(async () => {
        await result.current.addField({
          label: 'Age',
          value: '25',
          type: 'personal',
          isSensitive: false,
        });
      });

      expect(result.current.profile).toHaveLength(2);

      // Update a field
      await act(async () => {
        await result.current.updateField(0, { value: 'John Doe' });
      });

      expect(result.current.profile?.[0]?.value).toBe('John Doe');

      // Remove a field
      await act(async () => {
        await result.current.removeField(1);
      });

      expect(result.current.profile).toHaveLength(1);
      expect(result.current.profile?.[0]?.label).toBe('Name');
    });

    it('should maintain state consistency after first-time profile creation', async () => {
      const { result } = renderHook(() => useProfile());

      // Create profile
      await act(async () => {
        await result.current.saveProfileData(testPassphrase);
      });

      // Add fields when profile state is empty array
      const field1 = {
        label: 'Test Field 1',
        value: 'Value 1',
        type: 'personal' as const,
        isSensitive: false,
      };

      const field2 = {
        label: 'Test Field 2',
        value: 'Value 2',
        type: 'personal' as const,
        isSensitive: true,
      };

      await act(async () => {
        await result.current.addField(field1);
      });

      await act(async () => {
        await result.current.addField(field2);
      });

      // Verify duplicate label validation still works
      await act(async () => {
        await expect(result.current.addField({
          label: 'Test Field 1', // Duplicate
          value: 'Different Value',
          type: 'contact',
          isSensitive: false,
        })).rejects.toThrow('A field with this label already exists');
      });

      // Profile should still contain only the first two fields
      expect(result.current.profile).toHaveLength(2);
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
    it('should clear session state but maintain hasExistingProfile when profile exists in storage', async () => {
      // Set up mocks: profile exists in storage and can be loaded
      mockStorage.loadProfile.mockResolvedValueOnce(mockProfile);
      mockStorage.hasProfile.mockResolvedValue(true); // Profile exists in storage
      
      const { result } = renderHook(() => useProfile());

      // Load profile first to have something to clear
      await act(async () => {
        await result.current.loadProfileData(testPassphrase);
      });

      // Verify profile was loaded
      expect(result.current.profile).toEqual(mockProfile);

      // Clear profile (sign out)
      await act(async () => {
        await result.current.clearProfile();
      });

      // Session state should be cleared
      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBeNull();
      
      // But hasExistingProfile should reflect storage reality (true)
      expect(result.current.hasExistingProfile).toBe(true);
      expect(mockStorage.hasProfile).toHaveBeenCalledTimes(2); // Once on mount, once in clearProfile
    });

    it('should clear session state and set hasExistingProfile to false when no profile exists in storage', async () => {
      // Set up mocks: no profile in storage
      mockStorage.hasProfile.mockResolvedValue(false);
      
      const { result } = renderHook(() => useProfile());

      // Manually set some session state to clear
      await act(async () => {
        await result.current.addField({
          label: 'Test Field',
          value: 'Test Value',
          type: 'personal',
          isSensitive: false,
        });
      });

      // Clear profile
      await act(async () => {
        await result.current.clearProfile();
      });

      // All state should be cleared
      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.hasExistingProfile).toBe(false);
      expect(mockStorage.hasProfile).toHaveBeenCalledTimes(2); // Once on mount, once in clearProfile
    });

    it('should handle storage errors gracefully during clearProfile', async () => {
      // Set up mock to fail on hasProfile call during clear
      mockStorage.loadProfile.mockResolvedValueOnce(mockProfile);
      mockStorage.hasProfile
        .mockResolvedValueOnce(true) // Initial mount check succeeds
        .mockRejectedValueOnce(new Error('Storage error')); // Clear check fails
      
      const { result } = renderHook(() => useProfile());

      // Load profile first
      await act(async () => {
        await result.current.loadProfileData(testPassphrase);
      });

      // Clear profile - should handle storage error gracefully
      await act(async () => {
        await result.current.clearProfile();
      });

      // Session state should still be cleared
      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBeNull();
      
      // hasExistingProfile should default to false on error
      expect(result.current.hasExistingProfile).toBe(false);
    });
  });

  describe('Sign-Out Flow Integration', () => {
    it('should handle complete sign-out and sign-in cycle correctly', async () => {
      // Setup: Profile exists in storage
      mockStorage.hasProfile.mockResolvedValue(true);
      mockStorage.loadProfile.mockResolvedValue(mockProfile);
      
      const { result } = renderHook(() => useProfile());

      // Wait for initial mount check
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should recognize existing profile
      expect(result.current.hasExistingProfile).toBe(true);

      // Sign in (load profile)
      await act(async () => {
        await result.current.loadProfileData(testPassphrase);
      });

      expect(result.current.profile).toEqual(mockProfile);

      // Sign out (clear profile)
      await act(async () => {
        await result.current.clearProfile();
      });

      // Should maintain knowledge of existing profile
      expect(result.current.profile).toBeNull();
      expect(result.current.hasExistingProfile).toBe(true);

      // Sign in again
      await act(async () => {
        await result.current.loadProfileData(testPassphrase);
      });

      expect(result.current.profile).toEqual(mockProfile);
    });

    it('should differentiate between new user and returning user flows', async () => {
      // Test new user flow
      mockStorage.hasProfile.mockResolvedValue(false);
      
      const { result: newUserResult } = renderHook(() => useProfile());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(newUserResult.current.hasExistingProfile).toBe(false); // New user

      // Test returning user flow  
      mockStorage.hasProfile.mockResolvedValue(true);
      
      const { result: returningUserResult } = renderHook(() => useProfile());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(returningUserResult.current.hasExistingProfile).toBe(true); // Returning user
    });

    it('should preserve hasExistingProfile state through multiple sign-out/sign-in cycles', async () => {
      mockStorage.hasProfile.mockResolvedValue(true);
      mockStorage.loadProfile.mockResolvedValue(mockProfile);
      
      const { result } = renderHook(() => useProfile());

      // Initial state
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      expect(result.current.hasExistingProfile).toBe(true);

      // Cycle 1: Sign in -> Sign out
      await act(async () => {
        await result.current.loadProfileData(testPassphrase);
      });
      expect(result.current.profile).toEqual(mockProfile);

      await act(async () => {
        await result.current.clearProfile();
      });
      expect(result.current.profile).toBeNull();
      expect(result.current.hasExistingProfile).toBe(true);

      // Cycle 2: Sign in -> Sign out
      await act(async () => {
        await result.current.loadProfileData(testPassphrase);
      });
      expect(result.current.profile).toEqual(mockProfile);

      await act(async () => {
        await result.current.clearProfile();
      });
      expect(result.current.profile).toBeNull();
      expect(result.current.hasExistingProfile).toBe(true);

      // Verify hasProfile was called appropriately
      expect(mockStorage.hasProfile).toHaveBeenCalledTimes(3); // Mount + 2 clears
    });
  });
});