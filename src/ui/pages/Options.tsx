/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useProfile } from '../hooks/useProfile';
import { ProfileField } from '../../types';
import { EncryptionSettings } from '../components/EncryptionSettings';
import { ProfileList } from '../components/ProfileList';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { clearAllData } from '../../storage';

function OptionsApp() {
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
      setCurrentPassphrase(passphrase);
      if (!hasExistingProfile) {
        // saveProfileData now handles the case where profile is null
        // by defaulting to an empty array for first-time setup
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

  const handleDeleteAllData = async () => {
    if (window.confirm('Are you sure you want to delete ALL data? This action cannot be undone.')) {
      try {
        await clearAllData();
        await clearProfile();
        setIsUnlocked(false);
        setCurrentPassphrase('');
        alert('All data has been deleted successfully.');
      } catch {
        alert('Failed to delete data. Please try again.');
      }
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

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Job Application Co-Pilot
            </h1>
            <p className="text-lg text-gray-600">
              Privacy-first Chrome extension for intelligent job application autofill
            </p>
          </div>
          
          <EncryptionSettings
            onPassphraseSet={handlePassphraseSet}
            onPassphraseVerified={handlePassphraseVerified}
            hasExistingProfile={hasExistingProfile}
            isLoading={isLoading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Job Application Co-Pilot
              </h1>
              <p className="text-sm text-gray-600">
                Manage your profile data for intelligent form filling
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 mr-4">
                <div className="text-sm text-green-600 font-medium flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Profile Unlocked
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={handleSignOutRequest}
                title="Clears profile data from memory. Your encrypted data remains safe."
              >
                ↗️ Sign Out
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteAllData}
              >
                Delete All Data
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6">
          <ProfileList
            fields={profile || []}
            onAddField={handleAddField}
            onUpdateField={handleUpdateField}
            onDeleteField={handleRemoveField}
            isLoading={isLoading}
          />
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            Privacy & Security
          </h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• All your data is stored locally in your browser</li>
            <li>• Your profile is encrypted with your passphrase</li>
            <li>• No data is sent to external servers without your consent</li>
            <li>• You can delete all data at any time</li>
          </ul>
        </div>
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

// Initialize the options page
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<OptionsApp />);
}