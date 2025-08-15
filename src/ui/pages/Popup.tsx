/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useProfile } from '../hooks/useProfile';
import { ProfileField } from '../../types';
import { EncryptionSettings } from '../components/EncryptionSettings';
import { ProfileList } from '../components/ProfileList';
import { Button } from '../components/common/Button';

function PopupApp() {
  const {
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
  } = useProfile();

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [currentPassphrase, setCurrentPassphrase] = useState('');

  const handlePassphraseSet = async (passphrase: string) => {
    try {
      setCurrentPassphrase(passphrase);
      // For new profiles, create empty profile and save it
      if (!hasExistingProfile) {
        await saveProfileData(passphrase);
      }
      setIsUnlocked(true);
    } catch (err) {
      console.error('Failed to set passphrase:', err);
    }
  };

  const handlePassphraseVerified = async (passphrase: string) => {
    const success = await loadProfileData(passphrase);
    if (success) {
      setCurrentPassphrase(passphrase);
      setIsUnlocked(true);
    }
  };

  const handleAddField = async (field: ProfileField) => {
    await addField(field);
    if (currentPassphrase) {
      await saveProfileData(currentPassphrase);
    }
  };

  const handleUpdateField = async (index: number, field: Partial<ProfileField>) => {
    await updateField(index, field);
    if (currentPassphrase) {
      await saveProfileData(currentPassphrase);
    }
  };

  const handleRemoveField = async (index: number) => {
    await removeField(index);
    if (currentPassphrase) {
      await saveProfileData(currentPassphrase);
    }
  };

  const handleLock = () => {
    clearProfile();
    setIsUnlocked(false);
    setCurrentPassphrase('');
  };

  const openOptionsPage = () => {
    chrome.runtime.openOptionsPage();
  };

  if (!isUnlocked) {
    return (
      <div className="w-80 p-4">
        <EncryptionSettings
          onPassphraseSet={handlePassphraseSet}
          onPassphraseVerified={handlePassphraseVerified}
          hasExistingProfile={hasExistingProfile}
          isLoading={isLoading}
        />
      </div>
    );
  }

  return (
    <div className="w-96 max-h-96 overflow-y-auto">
      <div className="p-4 border-b border-gray-200 bg-white sticky top-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Job Application Co-Pilot
            </h1>
            <p className="text-xs text-gray-500">
              {profile?.length || 0} fields configured
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="small"
              variant="secondary"
              onClick={openOptionsPage}
              title="Open full options page"
            >
              ⚙️
            </Button>
            <Button
              size="small"
              variant="secondary"
              onClick={handleLock}
              title="Lock profile"
            >
              🔒
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <ProfileList
          fields={profile || []}
          onAddField={handleAddField}
          onUpdateField={handleUpdateField}
          onDeleteField={handleRemoveField}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

// Initialize the popup
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<PopupApp />);
}