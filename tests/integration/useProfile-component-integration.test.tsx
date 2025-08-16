import { renderHook, act } from '@testing-library/react';
import { useProfile } from '../../src/ui/hooks/useProfile';
import { UserProfile, ProfileField } from '../../src/types';
import * as storage from '../../src/storage';

// Mock the storage module
jest.mock('../../src/storage');
const mockStorage = storage as jest.Mocked<typeof storage>;

describe('useProfile Component Integration Tests', () => {
  const testPassphrase = 'TestPassword123!';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockStorage.hasProfile.mockResolvedValue(false);
    mockStorage.loadProfile.mockResolvedValue(null);
    mockStorage.saveProfile.mockResolvedValue(undefined);
  });

  /**
   * This test simulates the exact pattern used in Options.tsx:
   * 1. User loads profile
   * 2. User edits a field 
   * 3. handleUpdateField calls updateField() then saveProfileData()
   * 4. User adds a new field
   * 5. handleAddField calls addField() then saveProfileData()
   * 6. User signs out
   * 
   * The bug was that step 5's saveProfileData would use stale closure
   * and overwrite the new field with the old profile state.
   */
  describe('Options.tsx Component Pattern Simulation', () => {
    it('should persist all changes when following the component handleField pattern', async () => {
      const { result } = renderHook(() => useProfile());

      // 1. Simulate existing user with profile
      const initialProfile: UserProfile = [
        {
          label: 'First Name',
          value: 'John',
          type: 'personal',
          isSensitive: false,
        }
      ];

      mockStorage.hasProfile.mockResolvedValue(true);
      mockStorage.loadProfile.mockResolvedValue(initialProfile);

      // Load profile (user signs in)
      await act(async () => {
        await result.current.loadProfileData(testPassphrase);
      });

      expect(result.current.profile).toEqual(initialProfile);

      // 2. Simulate handleUpdateField from Options.tsx
      const handleUpdateField = async (index: number, field: Partial<ProfileField>) => {
        const updatedProfile = await result.current.updateField(index, field);
        if (testPassphrase) {
          await result.current.saveProfileData(testPassphrase, updatedProfile);
        }
      };

      // User edits the existing field
      await act(async () => {
        await handleUpdateField(0, { value: 'John Doe' });
      });

      // Verify the edit was saved
      expect(mockStorage.saveProfile).toHaveBeenLastCalledWith([
        { label: 'First Name', value: 'John Doe', type: 'personal', isSensitive: false }
      ], testPassphrase);

      // 3. Simulate handleAddField from Options.tsx
      const handleAddField = async (field: ProfileField) => {
        const updatedProfile = await result.current.addField(field);
        if (testPassphrase) {
          await result.current.saveProfileData(testPassphrase, updatedProfile);
        }
      };

      // User adds a new field (this was the problematic scenario)
      const newField: ProfileField = {
        label: 'Email',
        value: 'john.doe@example.com',
        type: 'personal',
        isSensitive: false,
      };

      await act(async () => {
        await handleAddField(newField);
      });

      // CRITICAL TEST: The save should include BOTH fields (edit + new field)
      expect(mockStorage.saveProfile).toHaveBeenLastCalledWith([
        { label: 'First Name', value: 'John Doe', type: 'personal', isSensitive: false },
        { label: 'Email', value: 'john.doe@example.com', type: 'personal', isSensitive: false }
      ], testPassphrase);

      // 4. Simulate user signing out
      mockStorage.hasProfile.mockResolvedValue(true);
      await act(async () => {
        await result.current.clearProfile();
      });

      // Profile should be cleared from memory
      expect(result.current.profile).toBeNull();

      // 5. Verify that if user signs back in, they get both fields
      mockStorage.loadProfile.mockResolvedValue([
        { label: 'First Name', value: 'John Doe', type: 'personal', isSensitive: false },
        { label: 'Email', value: 'john.doe@example.com', type: 'contact', isSensitive: false }
      ]);

      await act(async () => {
        await result.current.loadProfileData(testPassphrase);
      });

      expect(result.current.profile).toHaveLength(2);
      expect(result.current.profile?.[0]?.value).toBe('John Doe');
      expect(result.current.profile?.[1]?.label).toBe('Email');
    });

    it('should handle rapid field operations without losing data', async () => {
      const { result } = renderHook(() => useProfile());

      // Start with empty profile
      await act(async () => {
        await result.current.saveProfileData(testPassphrase);
      });

      // Simulate component handlers
      const handleAddField = async (field: ProfileField) => {
        const updatedProfile = await result.current.addField(field);
        await result.current.saveProfileData(testPassphrase, updatedProfile);
      };

      const handleUpdateField = async (index: number, field: Partial<ProfileField>) => {
        const updatedProfile = await result.current.updateField(index, field);
        await result.current.saveProfileData(testPassphrase, updatedProfile);
      };

      const handleRemoveField = async (index: number) => {
        const updatedProfile = await result.current.removeField(index);
        await result.current.saveProfileData(testPassphrase, updatedProfile);
      };

      // Rapid sequence of operations
      await act(async () => {
        await handleAddField({
          label: 'Name',
          value: 'John',
          type: 'personal',
          isSensitive: false,
        });
      });

      await act(async () => {
        await handleAddField({
          label: 'Email',
          value: 'john@example.com',
          type: 'personal',
          isSensitive: false,
        });
      });

      await act(async () => {
        await handleUpdateField(0, { value: 'John Doe' });
      });

      await act(async () => {
        await handleAddField({
          label: 'Phone',
          value: '555-1234',
          type: 'personal',
          isSensitive: true,
        });
      });

      await act(async () => {
        await handleRemoveField(1); // Remove email
      });

      // Final verification: should have Name (updated) and Phone
      expect(mockStorage.saveProfile).toHaveBeenLastCalledWith([
        { label: 'Name', value: 'John Doe', type: 'personal', isSensitive: false },
        { label: 'Phone', value: '555-1234', type: 'personal', isSensitive: true }
      ], testPassphrase);

      // Verify state consistency
      expect(result.current.profile).toHaveLength(2);
      expect(result.current.profile?.[0]?.value).toBe('John Doe');
      expect(result.current.profile?.[1]?.label).toBe('Phone');
    });

    it('should maintain data integrity during the exact bug reproduction scenario', async () => {
      const { result } = renderHook(() => useProfile());

      // Reproduce the exact scenario from the logs:
      // 1. User has existing profile with 1 field
      const existingProfile: UserProfile = [
        { label: 'First name', value: 'DanielK', type: 'personal', isSensitive: false }
      ];

      mockStorage.loadProfile.mockResolvedValue(existingProfile);
      await act(async () => {
        await result.current.loadProfileData(testPassphrase);
      });

      // 2. User edits the existing field
      const handleUpdateField = async (index: number, field: Partial<ProfileField>) => {
        const updatedProfile = await result.current.updateField(index, field);
        await result.current.saveProfileData(testPassphrase, updatedProfile);
      };

      await act(async () => {
        await handleUpdateField(0, { value: 'Daniel K' });
      });

      // 3. User immediately adds a new field (this was failing before the fix)
      const handleAddField = async (field: ProfileField) => {
        const updatedProfile = await result.current.addField(field);
        await result.current.saveProfileData(testPassphrase, updatedProfile);
      };

      await act(async () => {
        await handleAddField({
          label: 'Mine',
          value: '',
          type: 'custom',
          isSensitive: false,
        });
      });

      // 4. User signs out immediately
      mockStorage.hasProfile.mockResolvedValue(true);
      await act(async () => {
        await result.current.clearProfile();
      });

      // CRITICAL: The last save should have both fields
      const lastSaveCall = mockStorage.saveProfile.mock.calls[mockStorage.saveProfile.mock.calls.length - 1];
      expect(lastSaveCall[0]).toHaveLength(2);
      expect(lastSaveCall[0]).toEqual([
        { label: 'First name', value: 'Daniel K', type: 'personal', isSensitive: false },
        { label: 'Mine', value: '', type: 'custom', isSensitive: false }
      ]);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle save failures gracefully while preserving state', async () => {
      const { result } = renderHook(() => useProfile());

      // Load initial profile
      const initialProfile: UserProfile = [
        { label: 'Test Field', value: 'Test Value', type: 'personal', isSensitive: false }
      ];

      mockStorage.loadProfile.mockResolvedValue(initialProfile);
      await act(async () => {
        await result.current.loadProfileData(testPassphrase);
      });

      // Add field successfully
      let updatedProfile: UserProfile;
      await act(async () => {
        updatedProfile = await result.current.addField({
          label: 'New Field',
          value: 'New Value',
          type: 'custom',
          isSensitive: false,
        });
      });

      // Simulate save failure
      mockStorage.saveProfile.mockRejectedValueOnce(new Error('Storage full'));

      await act(async () => {
        await expect(
          result.current.saveProfileData(testPassphrase, updatedProfile!)
        ).rejects.toThrow('Storage full');
      });

      // State should still contain the added field even though save failed
      expect(result.current.profile).toHaveLength(2);
      expect(result.current.error).toBe('Storage full');
    });

    it('should handle profile override with empty array', async () => {
      const { result } = renderHook(() => useProfile());

      // Load non-empty profile
      mockStorage.loadProfile.mockResolvedValue([
        { label: 'Test', value: 'Test', type: 'personal', isSensitive: false }
      ]);

      await act(async () => {
        await result.current.loadProfileData(testPassphrase);
      });

      // Save with empty profile override (simulating complete profile clear)
      await act(async () => {
        await result.current.saveProfileData(testPassphrase, []);
      });

      expect(mockStorage.saveProfile).toHaveBeenLastCalledWith([], testPassphrase);
    });
  });
});