"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { processFileForUpload } from "@/lib/image-compression";

interface Settings {
  teacherName: string;
  teacherEmail: string;
  teacherPhoto: string;
  language: string;
  theme: string;
  notifications: {
    email: boolean;
    push: boolean;
    lessonReminders: boolean;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({
    teacherName: "Anastasiia",
    teacherEmail: "",
    teacherPhoto: "/teacher.jpg", // Default photo, will be overridden if user uploaded custom photo
    language: "en",
    theme: "light",
    notifications: {
      email: true,
      push: true,
      lessonReminders: true,
    },
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // 2FA states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");
  const [currentFactorId, setCurrentFactorId] = useState<string | null>(null);
  const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);
  const [disableVerificationCode, setDisableVerificationCode] = useState("");
  const [showSignOutAllModal, setShowSignOutAllModal] = useState(false);


  useEffect(() => {
    loadUserData();
    const stored = localStorage.getItem("polspeak-settings");
    if (stored) {
      try {
        const parsedSettings = JSON.parse(stored);
        // Don't load teacherPhoto from localStorage, always load from Supabase
        setSettings(prev => ({
          ...prev,
          teacherName: parsedSettings.teacherName || prev.teacherName,
          language: parsedSettings.language || prev.language,
          theme: parsedSettings.theme || prev.theme,
          notifications: parsedSettings.notifications || prev.notifications,
        }));
      } catch (e) {
        // Failed to parse settings
      }
    }
  }, []);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      setUserEmail(user.email);

      // Try to load profile photo from Supabase
      const { data: files } = await supabase.storage
        .from('lesson-files')
        .list('profile-photos', {
          search: user.id
        });

      let photoUrl = "/teacher.jpg"; // Default photo
      if (files && files.length > 0) {
        const photoFile = files[0];
        const { data: { publicUrl } } = supabase.storage
          .from('lesson-files')
          .getPublicUrl(`profile-photos/${photoFile.name}`);
        photoUrl = publicUrl;
      }

      setSettings(prev => ({
        ...prev,
        teacherEmail: user.email || "",
        teacherPhoto: photoUrl
      }));

      // Check if 2FA is enabled and verified
      const { data: mfaData } = await supabase.auth.mfa.listFactors();
      const totpFactor = mfaData?.totp?.[0];
      const isVerified = totpFactor && totpFactor.status === 'verified';
      setTwoFactorEnabled(isVerified || false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPasswordError("User not authenticated");
        return;
      }

      // Process file (compress image, validate size)
      const { processedFile, valid, message } = await processFileForUpload(file);

      if (!valid) {
        setPasswordError(message || "File too large");
        return;
      }

      // First, delete any existing profile photos for this user
      const { data: existingFiles } = await supabase.storage
        .from('lesson-files')
        .list('profile-photos', {
          search: user.id
        });

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(file => `profile-photos/${file.name}`);
        await supabase.storage
          .from('lesson-files')
          .remove(filesToDelete);
      }

      // Upload new photo to Supabase Storage (using compressed file)
      const fileExt = processedFile.name.split('.').pop() || 'webp';
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `profile-photos/${fileName}`;

      // Upload processed file
      const { error: uploadError } = await supabase.storage
        .from('lesson-files')
        .upload(filePath, processedFile, {
          cacheControl: '3600',
          upsert: false // Don't overwrite, we already deleted
        });

      if (uploadError) {
        setPasswordError("Failed to upload photo: " + uploadError.message);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('lesson-files')
        .getPublicUrl(filePath);

      setSettings({ ...settings, teacherPhoto: publicUrl });
    } catch (error: any) {
      setPasswordError("Failed to upload photo: " + error.message);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPasswordError("User not authenticated");
        return;
      }

      // Delete all profile photos for this user from Supabase Storage
      const { data: existingFiles } = await supabase.storage
        .from('lesson-files')
        .list('profile-photos', {
          search: user.id
        });

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(file => `profile-photos/${file.name}`);
        await supabase.storage
          .from('lesson-files')
          .remove(filesToDelete);
      }

      // Reset to default photo
      setSettings({ ...settings, teacherPhoto: "/teacher.jpg" });
    } catch (error: any) {
      setPasswordError("Failed to remove photo: " + error.message);
    }
  };

  // 2FA Functions
  const handleEnable2FA = async () => {
    setTwoFactorError("");

    try {
      // Check if already enrolled
      const { data: existingFactors } = await supabase.auth.mfa.listFactors();

      // Delete ALL existing factors (all array, not just totp)
      if (existingFactors?.all && existingFactors.all.length > 0) {
        for (const factor of existingFactors.all) {
          if (factor.status === 'verified') {
            setTwoFactorError("2FA is already enabled. Please disable it first using the Disable button.");
            return;
          }

          // Try to delete unverified factors
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }

        // Wait a bit for deletions to process
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Enroll new factor
      const friendlyName = `NastyKnowledge Authenticator ${Date.now()}`;
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: friendlyName,
      });

      if (error) {
        throw error;
      }

      if (data) {
        setCurrentFactorId(data.id); // Save the factor ID
        setQrCodeUrl(data.totp.qr_code);
        setShowQRCode(true);
      }
    } catch (error: any) {
      setTwoFactorError(error.message || "Failed to enable 2FA");
    }
  };

  const handleVerifyAndEnable2FA = async () => {
    setTwoFactorError("");

    try {
      // Use the saved factor ID from enrollment
      const factorId = currentFactorId;

      if (!factorId) {
        setTwoFactorError("No factor ID found. Please try enabling 2FA again.");
        return;
      }

      // Create a challenge first
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factorId,
      });

      if (challengeError) {
        throw challengeError;
      }

      // Now verify with the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: challengeData.id,
        code: verificationCode,
      });

      if (verifyError) {
        throw verifyError;
      }

      // Reload user data to get updated 2FA status
      await loadUserData();

      setShowQRCode(false);
      setVerificationCode("");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      setTwoFactorError(error.message || "Invalid verification code");
    }
  };

  const handleDisable2FA = async () => {
    // Show modal to get verification code
    setTwoFactorError("");
    setDisableVerificationCode("");
    setShowDisable2FAModal(true);
  };

  const handleConfirmDisable2FA = async () => {
    setTwoFactorError("");

    try {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp?.[0];

      if (!totpFactor) {
        setTwoFactorError("No 2FA factor found");
        return;
      }

      // Create a challenge first to verify the user
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

      if (challengeError) {
        throw challengeError;
      }

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code: disableVerificationCode,
      });

      if (verifyError) {
        throw verifyError;
      }

      // Now unenroll the factor
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: totpFactor.id,
      });

      if (unenrollError) {
        throw unenrollError;
      }

      // Reload user data to get updated 2FA status
      await loadUserData();

      setShowDisable2FAModal(false);
      setDisableVerificationCode("");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      setTwoFactorError(error.message || "Failed to disable 2FA. Please check your code.");
    }
  };

  const handleSignOutAllDevices = async () => {
    try {
      setIsSaving(true);

      // Sign out from all sessions (this will invalidate all refresh tokens)
      const { error } = await supabase.auth.signOut({ scope: 'global' });

      if (error) throw error;

      // Redirect to login page
      router.push('/');
    } catch (error: any) {
      console.error('Error signing out from all devices:', error);
      setPasswordError('Failed to sign out from all devices. Please try again.');
    } finally {
      setIsSaving(false);
      setShowSignOutAllModal(false);
    }
  };

  const handleSave = async () => {
    // Check password match if user is trying to change password
    if (password || confirmPassword || currentPassword) {
      // Validate current password is provided
      if (!currentPassword) {
        setPasswordError("Please enter your current password");
        return;
      }

      if (password !== confirmPassword) {
        setPasswordError("Passwords do not match");
        return;
      }
      if (password.length < 6) {
        setPasswordError("Password must be at least 6 characters");
        return;
      }
    }

    setPasswordError("");
    setIsSaving(true);

    try {
      // Save settings to localStorage
      localStorage.setItem("polspeak-settings", JSON.stringify(settings));

      // Dispatch custom event to notify Sidebar of settings change
      window.dispatchEvent(new Event("settings-updated"));

      // Update password in Supabase if provided
      if (password && currentPassword) {
        // First, verify the current password by attempting to sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: currentPassword,
        });

        if (signInError) {
          setPasswordError("Current password is incorrect");
          setIsSaving(false);
          return;
        }

        // If current password is correct, update to new password
        const { error: updateError } = await supabase.auth.updateUser({
          password: password,
        });

        if (updateError) {
          setPasswordError("Failed to update password: " + updateError.message);
          setIsSaving(false);
          return;
        }
      }

      setIsSaving(false);
      setShowSuccess(true);
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      setPasswordError("Failed to save: " + error.message);
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50/50 pb-16 md:pb-20 xl:pb-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#e2e8f0]">
          <div className="px-3 md:px-6 py-4 md:py-5">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#1e293b] tracking-tight">
                Settings
              </h2>
              <p className="text-[#64748b] text-xs md:text-sm mt-1 hidden sm:block">
                Manage your profile
              </p>
            </div>
          </div>
        </div>

        {/* Success Toast */}
        {showSuccess && (
          <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in-right">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span className="text-sm font-medium">Settings saved successfully!</span>
          </div>
        )}

        {/* Content */}
        <div className="px-3 md:px-6 py-4 md:py-6">
          <div className="max-w-4xl mx-auto">
            {/* Profile Section */}
            <div className="bg-white rounded-lg border border-[#e2e8f0] p-6">
              <h3 className="text-lg font-bold text-[#1e293b] mb-6">Profile Information</h3>

              <div className="flex flex-col gap-6">
                {/* Profile Photo */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Profile Photo
                  </label>
                  <div className="flex items-center gap-4">
                    {settings.teacherPhoto && settings.teacherPhoto !== "/teacher.jpg" ? (
                      <div className="relative group">
                        <img
                          src={settings.teacherPhoto}
                          alt="Profile"
                          className="size-20 rounded-full object-cover border-2 border-slate-200"
                        />
                        {/* Delete overlay - hover on desktop, always visible on mobile/tablet */}
                        <button
                          onClick={handleRemovePhoto}
                          className="absolute inset-0 rounded-full bg-black/60 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          title="Remove photo"
                        >
                          <span className="material-symbols-outlined text-white text-2xl">delete</span>
                        </button>
                      </div>
                    ) : (
                      <img
                        src="/teacher.jpg"
                        alt="Profile"
                        className="size-20 rounded-full object-cover border-2 border-slate-200"
                      />
                    )}
                    <div className="flex flex-col gap-2">
                      <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer inline-flex items-center gap-2 w-fit">
                        <span className="material-symbols-outlined text-[18px]">upload</span>
                        {settings.teacherPhoto !== "/teacher.jpg" ? "Change Photo" : "Upload Photo"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-slate-500">
                        JPG, PNG or GIF. Max size 500KB (auto-compressed).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={settings.teacherName}
                    onChange={(e) =>
                      setSettings({ ...settings, teacherName: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter your name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={settings.teacherEmail}
                    readOnly
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed"
                    placeholder="your@email.com"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Email cannot be changed
                  </p>
                </div>

                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setPasswordError("");
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter current password to change password"
                  />
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError("");
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter new password (leave blank to keep current)"
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordError("");
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Confirm new password"
                  />
                  {passwordError && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {passwordError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Two-Factor Authentication Section */}
            <div className="mt-6 bg-white rounded-lg border border-[#e2e8f0] p-6">
              <h3 className="text-lg font-bold text-[#1e293b] mb-2">Two-Factor Authentication (2FA)</h3>
              <p className="text-sm text-slate-600 mb-6">
                Add an extra layer of security to your account
              </p>

              <div className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex gap-3">
                  <div className={`size-10 rounded-full flex items-center justify-center ${twoFactorEnabled ? 'bg-green-100' : 'bg-slate-200'}`}>
                    <span className={`material-symbols-outlined text-xl ${twoFactorEnabled ? 'text-green-600' : 'text-slate-500'}`}>
                      {twoFactorEnabled ? 'shield_with_heart' : 'shield'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      {twoFactorEnabled ? '2FA Enabled' : '2FA Disabled'}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">
                      {twoFactorEnabled
                        ? 'Your account is protected with two-factor authentication'
                        : 'Enable 2FA to secure your account with an authenticator app'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={twoFactorEnabled ? handleDisable2FA : handleEnable2FA}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    twoFactorEnabled
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {twoFactorEnabled ? 'Disable' : 'Enable'}
                </button>
              </div>

              {twoFactorError && (
                <p className="text-xs text-red-600 mt-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {twoFactorError}
                </p>
              )}
            </div>

            {/* Session Management Section */}
            <div className="mt-6 bg-white rounded-lg border border-[#e2e8f0] p-6">
              <h3 className="text-lg font-bold text-[#1e293b] mb-2">Session Management</h3>
              <p className="text-sm text-slate-600 mb-6">
                Sign out from all devices where you are currently logged in
              </p>

              {/* Sign Out All Devices Button */}
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="size-10 rounded-full flex items-center justify-center bg-red-100">
                      <span className="material-symbols-outlined text-xl text-red-600">
                        logout
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        Sign Out All Devices
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        This will sign you out from all devices including this one. You will need to log in again.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSignOutAllModal(true)}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Sign Out All
                  </button>
                </div>
              </div>
            </div>

            {/* QR Code Modal */}
            {showQRCode && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-12 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="material-symbols-outlined text-indigo-600">qr_code_scanner</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Set Up 2FA</h3>
                      <p className="text-sm text-slate-500">Scan with your authenticator app</p>
                    </div>
                  </div>

                  <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-sm text-slate-700 mb-3">
                      1. Download an authenticator app (Google Authenticator, Authy, etc.)
                    </p>
                    <p className="text-sm text-slate-700 mb-3">
                      2. Scan this QR code with your app
                    </p>
                    {qrCodeUrl && (
                      <div className="flex justify-center mb-3 bg-white p-4 rounded-lg">
                        <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                      </div>
                    )}
                    <p className="text-sm text-slate-700">
                      3. Enter the 6-digit code from your app below
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="w-full h-12 px-4 rounded-lg border border-slate-200 text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="000000"
                      maxLength={6}
                    />
                    {twoFactorError && (
                      <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        {twoFactorError}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowQRCode(false);
                        setVerificationCode("");
                        setTwoFactorError("");
                      }}
                      className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleVerifyAndEnable2FA}
                      disabled={verificationCode.length !== 6}
                      className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Verify & Enable
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Disable 2FA Modal */}
            {showDisable2FAModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-12 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="material-symbols-outlined text-red-600 text-2xl">lock_open</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Disable 2FA</h3>
                      <p className="text-sm text-slate-500">Verify to disable two-factor authentication</p>
                    </div>
                  </div>

                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <span className="material-symbols-outlined text-[16px] inline-block mr-1">warning</span>
                      Disabling 2FA will make your account less secure. Please enter your current authenticator code to confirm.
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      value={disableVerificationCode}
                      onChange={(e) => setDisableVerificationCode(e.target.value)}
                      className="w-full h-12 px-4 rounded-lg border border-slate-200 text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="000000"
                      maxLength={6}
                      autoFocus
                    />
                    {twoFactorError && (
                      <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        {twoFactorError}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDisable2FAModal(false);
                        setDisableVerificationCode("");
                        setTwoFactorError("");
                      }}
                      className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmDisable2FA}
                      disabled={disableVerificationCode.length !== 6}
                      className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Disable 2FA
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sign Out All Devices Modal */}
            {showSignOutAllModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="size-12 rounded-full flex items-center justify-center bg-red-100 flex-shrink-0">
                      <span className="material-symbols-outlined text-2xl text-red-600">
                        logout
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900">
                        Sign Out All Devices?
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        This action will sign you out from all devices
                      </p>
                    </div>
                  </div>

                  {/* Warning Message */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex gap-3">
                      <span className="material-symbols-outlined text-red-600 text-xl flex-shrink-0">
                        warning
                      </span>
                      <div>
                        <p className="text-sm font-medium text-red-900">
                          You will be signed out from this device too
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          You will need to log in again on all devices, including this one. Make sure you remember your credentials.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowSignOutAllModal(false)}
                      disabled={isSaving}
                      className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSignOutAllDevices}
                      disabled={isSaving}
                      className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                          Signing Out...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">logout</span>
                          Sign Out All
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-[#00132c] hover:bg-[#0f2545] text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
