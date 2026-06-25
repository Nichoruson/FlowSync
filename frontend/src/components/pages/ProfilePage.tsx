import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, User, Key, Save, FolderKanban } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Name cannot be empty');
      return;
    }

    if (newPassword || currentPassword) {
      if (!currentPassword) {
        setErrorMsg('Current password is required to change password');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('New passwords do not match');
        return;
      }
      if (newPassword.length < 8) {
        setErrorMsg('New password must be at least 8 characters long');
        return;
      }
      if (!/[0-9]/.test(newPassword)) {
        setErrorMsg('New password must contain at least one number');
        return;
      }
    }

    setLoading(true);
    try {
      await updateProfile(
        name,
        newPassword ? currentPassword : undefined,
        newPassword ? newPassword : undefined
      );
      setSuccessMsg('Profile updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page-container">
      {/* Header */}
      <header className="profile-header">
        <a href="#/" className="back-link-btn">
          <ArrowLeft size={18} />
          <span>Back to Dashboard</span>
        </a>
        <div className="brand">
          <FolderKanban className="logo-icon" />
          <span className="logo-text">FlowSync</span>
        </div>
      </header>

      {/* Profile Form Card */}
      <main className="profile-main">
        <div className="profile-card animate-scale-up">
          <div className="profile-card-header">
            <h2>Account Profile</h2>
            <p>Update your account details and password settings.</p>
          </div>

          {successMsg && <div className="success-banner">{successMsg}</div>}
          {errorMsg && <div className="error-banner">{errorMsg}</div>}

          <form onSubmit={handleUpdateProfile} className="profile-form">
            {/* Read-only Email Field */}
            <div className="form-group readonly">
              <label>Email Address</label>
              <input type="email" value={user?.email || ''} readOnly disabled />
              <small className="help-text">Email address cannot be changed.</small>
            </div>

            {/* Editable Name Field */}
            <div className="form-group">
              <label htmlFor="user-name">Full Name</label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  id="user-name"
                  type="text"
                  placeholder="Enter full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <hr className="divider" />

            {/* Password Change Section */}
            <div className="password-section-title">
              <Key size={18} />
              <h3>Change Password</h3>
            </div>
            <p className="section-subtitle">Leave fields blank if you do not wish to change your password.</p>

            <div className="form-group">
              <label htmlFor="curr-pwd">Current Password</label>
              <input
                id="curr-pwd"
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="form-group-row">
              <div className="form-group">
                <label htmlFor="new-pwd">New Password</label>
                <input
                  id="new-pwd"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="conf-pwd">Confirm New Password</label>
                <input
                  id="conf-pwd"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-save-profile" disabled={loading}>
                <Save size={18} />
                <span>{loading ? 'Saving Changes...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
