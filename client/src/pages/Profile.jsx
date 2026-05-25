import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, updatePassword } from '../services/authService';
import toast from 'react-hot-toast';
import { HiOutlineUser, HiOutlineLockClosed, HiOutlineSave } from 'react-icons/hi';

const Profile = () => {
  const { user, updateUser } = useAuth();
  
  // Profile State
  const [profileData, setProfileData] = useState({
    name: '',
    email: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // Password State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Load user data on mount
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || ''
      });
    }
  }, [user]);

  // Handlers
  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const submitProfile = async (e) => {
    e.preventDefault();
    if (!profileData.name.trim() || !profileData.email.trim()) {
      return toast.error('Name and email are required');
    }

    setProfileLoading(true);
    try {
      const res = await updateProfile(profileData);
      updateUser(res.data.user);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      return toast.error('All password fields are required');
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error('New passwords do not match');
    }

    if (passwordData.newPassword.length < 6) {
      return toast.error('New password must be at least 6 characters long');
    }

    setPasswordLoading(true);
    try {
      await updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('Password updated successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Profile Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account information and security</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section 1: Account Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
            <HiOutlineUser className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-semibold text-gray-800">Account Information</h2>
          </div>
          <form onSubmit={submitProfile} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                name="name"
                value={profileData.name}
                onChange={handleProfileChange}
                className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                name="email"
                value={profileData.email}
                onChange={handleProfileChange}
                className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3"
              />
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={profileLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <HiOutlineSave className="w-4 h-4" />
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Section 2: Password */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
            <HiOutlineLockClosed className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-semibold text-gray-800">Change Password</h2>
          </div>
          <form onSubmit={submitPassword} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3"
              />
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={passwordLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <HiOutlineLockClosed className="w-4 h-4" />
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
