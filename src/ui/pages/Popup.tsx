import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useProfile } from '../hooks/useProfile';
import { ProfileField } from '../../types';
import { EncryptionSettings } from '../components/EncryptionSettings';
import { ProfileList } from '../components/ProfileList';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Logger } from '../../utils';

const logger = new Logger('Popup');

export function PopupApp() {
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
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handlePassphraseSet = async (passphrase: string) => {
    try {
      logger.debug('Attempting to set passphrase');
      setCurrentPassphrase(passphrase);
      // For new profiles, create empty profile and save it
      if (!hasExistingProfile) {
        await saveProfileData(passphrase);
      }
      setIsUnlocked(true);
      logger.info('Passphrase set and user is unlocked');
    } catch (err) {
      logger.error('Failed to set passphrase:', err);
    }
  };

  const handlePassphraseVerified = async (passphrase: string) => {
    logger.debug('Attempting to verify passphrase');
    const success = await loadProfileData(passphrase);
    if (success) {
      setCurrentPassphrase(passphrase);
      setIsUnlocked(true);
      logger.info('Passphrase verified and user is unlocked');
    }
  };

  const handleAddField = async (field: ProfileField) => {
    const updatedProfile = await addField(field);
    if (currentPassphrase) {
      await saveProfileData(currentPassphrase, updatedProfile);
    }
  };

  const handleUpdateField = async (index: number, field: Partial<ProfileField>) => {
    const updatedProfile = await updateField(index, field);
    if (currentPassphrase) {
      await saveProfileData(currentPassphrase, updatedProfile);
    }
  };

  const handleRemoveField = async (index: number) => {
    const updatedProfile = await removeField(index);
    if (currentPassphrase) {
      await saveProfileData(currentPassphrase, updatedProfile);
    }
  };

  const handleSignOutRequest = () => {
    setShowSignOutConfirm(true);
  };

  const handleSignOutConfirm = async () => {
    await clearProfile();
    setIsUnlocked(false);
    setCurrentPassphrase('');
    setShowSignOutConfirm(false);
  };

  const handleSignOutCancel = () => {
    setShowSignOutConfirm(false);
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
              onClick={handleSignOutRequest}
              title="Clears profile data from memory. Your encrypted data remains safe."
            >
              ↗️
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

      {/* Sign Out Confirmation Modal */}
      <Modal
        isOpen={showSignOutConfirm}
        onClose={handleSignOutCancel}
        title="Sign Out"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This will clear your profile from memory. You'll need to enter your passphrase again to access your profile.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <strong>Your encrypted data remains safely stored</strong> and will not be deleted.
            </p>
          </div>
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={handleSignOutCancel}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSignOutConfirm}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Initialize the popup
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<PopupApp />);
}