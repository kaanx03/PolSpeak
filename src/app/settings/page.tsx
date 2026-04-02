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

const translations = {
  en: {
    title: "Settings", subtitle: "Manage your profile", signOut: "Sign out",
    profileSection: "Profile Information", profilePhoto: "Profile Photo",
    changePhoto: "Change Photo", uploadPhoto: "Upload Photo",
    photoHint: "JPG, PNG or GIF. Max size 500KB (auto-compressed).",
    fullName: "Full Name", namePlaceholder: "Enter your name",
    emailLabel: "Email Address", emailHint: "Email cannot be changed",
    currentPassword: "Current Password", currentPasswordPlaceholder: "Enter current password to change password",
    newPassword: "New Password", newPasswordPlaceholder: "Enter new password (leave blank to keep current)",
    confirmPassword: "Confirm New Password", confirmPasswordPlaceholder: "Confirm new password",
    twoFactorSection: "Two-Factor Authentication (2FA)", twoFactorSubtitle: "Add an extra layer of security to your account",
    twoFactorEnabled: "2FA Enabled", twoFactorDisabled: "2FA Disabled",
    twoFactorEnabledDesc: "Your account is protected with two-factor authentication",
    twoFactorDisabledDesc: "Enable 2FA to secure your account with an authenticator app",
    disable: "Disable", enable: "Enable",
    sessionSection: "Session Management", sessionSubtitle: "Sign out from all devices where you are currently logged in",
    signOutAllTitle: "Sign Out All Devices", signOutAllDesc: "This will sign you out from all devices including this one. You will need to log in again.",
    signOutAll: "Sign Out All", languageSubtitle: "Select the interface language",
    saveChanges: "Save Changes", saving: "Saving...",
    setup2faTitle: "Set Up 2FA", setup2faSubtitle: "Scan with your authenticator app",
    setup2faStep1: "1. Download an authenticator app (Google Authenticator, Authy, etc.)",
    setup2faStep2: "2. Scan this QR code with your app",
    setup2faStep3: "3. Enter the 6-digit code from your app below",
    verificationCode: "Verification Code", cancel: "Cancel", verifyAndEnable: "Verify & Enable",
    disable2faTitle: "Disable 2FA", disable2faSubtitle: "Verify to disable two-factor authentication",
    disable2faWarning: "Disabling 2FA will make your account less secure. Please enter your current authenticator code to confirm.",
    disable2fa: "Disable 2FA",
    signOutAllModalTitle: "Sign Out All Devices?", signOutAllModalSubtitle: "This action will sign you out from all devices",
    signOutAllWarningTitle: "You will be signed out from this device too",
    signOutAllWarningDesc: "You will need to log in again on all devices, including this one. Make sure you remember your credentials.",
    signingOut: "Signing Out...", success: "Settings saved successfully!",
    errNoCurrentPw: "Please enter your current password", errMismatch: "Passwords do not match",
    errTooShort: "Password must be at least 6 characters", errIncorrect: "Current password is incorrect",
    errUpdateFailed: "Failed to update password: ", errSaveFailed: "Failed to save: ",
  },
  uk: {
    title: "Налаштування", subtitle: "Керуйте своїм профілем", signOut: "Вийти",
    profileSection: "Інформація профілю", profilePhoto: "Фото профілю",
    changePhoto: "Змінити фото", uploadPhoto: "Завантажити фото",
    photoHint: "JPG, PNG або GIF. Макс. 500KB (авто-стиснення).",
    fullName: "Повне ім'я", namePlaceholder: "Введіть ваше ім'я",
    emailLabel: "Електронна пошта", emailHint: "Електронну пошту не можна змінити",
    currentPassword: "Поточний пароль", currentPasswordPlaceholder: "Введіть поточний пароль для зміни",
    newPassword: "Новий пароль", newPasswordPlaceholder: "Новий пароль (залиште порожнім для збереження)",
    confirmPassword: "Підтвердіть новий пароль", confirmPasswordPlaceholder: "Підтвердіть новий пароль",
    twoFactorSection: "Двофакторна автентифікація (2FA)", twoFactorSubtitle: "Додайте додатковий рівень захисту",
    twoFactorEnabled: "2FA увімкнено", twoFactorDisabled: "2FA вимкнено",
    twoFactorEnabledDesc: "Ваш обліковий запис захищено двофакторною автентифікацією",
    twoFactorDisabledDesc: "Увімкніть 2FA для захисту облікового запису",
    disable: "Вимкнути", enable: "Увімкнути",
    sessionSection: "Управління сесіями", sessionSubtitle: "Вийдіть з усіх пристроїв, де ви зараз авторизовані",
    signOutAllTitle: "Вийти з усіх пристроїв", signOutAllDesc: "Це призведе до виходу з усіх пристроїв, включно з цим. Вам потрібно буде увійти знову.",
    signOutAll: "Вийти з усіх", languageSubtitle: "Оберіть мову інтерфейсу",
    saveChanges: "Зберегти зміни", saving: "Збереження...",
    setup2faTitle: "Налаштування 2FA", setup2faSubtitle: "Відскануйте за допомогою автентифікатора",
    setup2faStep1: "1. Завантажте додаток-автентифікатор (Google Authenticator, Authy тощо)",
    setup2faStep2: "2. Відскануйте цей QR-код своїм додатком",
    setup2faStep3: "3. Введіть 6-значний код із додатку нижче",
    verificationCode: "Код підтвердження", cancel: "Скасувати", verifyAndEnable: "Підтвердити та увімкнути",
    disable2faTitle: "Вимкнути 2FA", disable2faSubtitle: "Підтвердіть вимкнення двофакторної автентифікації",
    disable2faWarning: "Вимкнення 2FA знижує безпеку вашого облікового запису. Введіть поточний код автентифікатора для підтвердження.",
    disable2fa: "Вимкнути 2FA",
    signOutAllModalTitle: "Вийти з усіх пристроїв?", signOutAllModalSubtitle: "Ця дія призведе до виходу з усіх пристроїв",
    signOutAllWarningTitle: "Ви також вийдете з цього пристрою",
    signOutAllWarningDesc: "Вам потрібно буде знову увійти на всіх пристроях. Переконайтеся, що пам'ятаєте свої дані.",
    signingOut: "Вихід...", success: "Налаштування успішно збережено!",
    errNoCurrentPw: "Будь ласка, введіть поточний пароль", errMismatch: "Паролі не збігаються",
    errTooShort: "Пароль має містити мінімум 6 символів", errIncorrect: "Поточний пароль невірний",
    errUpdateFailed: "Не вдалося оновити пароль: ", errSaveFailed: "Не вдалося зберегти: ",
  },
  pl: {
    title: "Ustawienia", subtitle: "Zarządzaj swoim profilem", signOut: "Wyloguj się",
    profileSection: "Informacje o profilu", profilePhoto: "Zdjęcie profilowe",
    changePhoto: "Zmień zdjęcie", uploadPhoto: "Prześlij zdjęcie",
    photoHint: "JPG, PNG lub GIF. Maks. 500KB (auto-kompresja).",
    fullName: "Imię i nazwisko", namePlaceholder: "Wpisz swoje imię",
    emailLabel: "Adres e-mail", emailHint: "Adres e-mail nie może być zmieniony",
    currentPassword: "Aktualne hasło", currentPasswordPlaceholder: "Wpisz aktualne hasło, aby je zmienić",
    newPassword: "Nowe hasło", newPasswordPlaceholder: "Nowe hasło (zostaw puste, aby zachować obecne)",
    confirmPassword: "Potwierdź nowe hasło", confirmPasswordPlaceholder: "Potwierdź nowe hasło",
    twoFactorSection: "Uwierzytelnianie dwuskładnikowe (2FA)", twoFactorSubtitle: "Dodaj dodatkową warstwę zabezpieczeń do swojego konta",
    twoFactorEnabled: "2FA włączone", twoFactorDisabled: "2FA wyłączone",
    twoFactorEnabledDesc: "Twoje konto jest chronione uwierzytelnianiem dwuskładnikowym",
    twoFactorDisabledDesc: "Włącz 2FA, aby zabezpieczyć konto aplikacją uwierzytelniającą",
    disable: "Wyłącz", enable: "Włącz",
    sessionSection: "Zarządzanie sesją", sessionSubtitle: "Wyloguj się ze wszystkich urządzeń, na których jesteś zalogowany",
    signOutAllTitle: "Wyloguj ze wszystkich urządzeń", signOutAllDesc: "Spowoduje to wylogowanie ze wszystkich urządzeń, w tym z tego. Będziesz musiał zalogować się ponownie.",
    signOutAll: "Wyloguj wszystko", languageSubtitle: "Wybierz język interfejsu",
    saveChanges: "Zapisz zmiany", saving: "Zapisywanie...",
    setup2faTitle: "Konfiguracja 2FA", setup2faSubtitle: "Zeskanuj za pomocą aplikacji uwierzytelniającej",
    setup2faStep1: "1. Pobierz aplikację uwierzytelniającą (Google Authenticator, Authy itp.)",
    setup2faStep2: "2. Zeskanuj ten kod QR swoją aplikacją",
    setup2faStep3: "3. Wpisz 6-cyfrowy kod z aplikacji poniżej",
    verificationCode: "Kod weryfikacyjny", cancel: "Anuluj", verifyAndEnable: "Zweryfikuj i włącz",
    disable2faTitle: "Wyłącz 2FA", disable2faSubtitle: "Potwierdź wyłączenie uwierzytelniania dwuskładnikowego",
    disable2faWarning: "Wyłączenie 2FA zmniejszy bezpieczeństwo Twojego konta. Wpisz aktualny kod uwierzytelniający, aby potwierdzić.",
    disable2fa: "Wyłącz 2FA",
    signOutAllModalTitle: "Wylogować ze wszystkich urządzeń?", signOutAllModalSubtitle: "Ta akcja wyloguje Cię ze wszystkich urządzeń",
    signOutAllWarningTitle: "Zostaniesz wylogowany również z tego urządzenia",
    signOutAllWarningDesc: "Będziesz musiał zalogować się ponownie na wszystkich urządzeniach. Upewnij się, że pamiętasz swoje dane logowania.",
    signingOut: "Wylogowywanie...", success: "Ustawienia zostały zapisane!",
    errNoCurrentPw: "Proszę podać aktualne hasło", errMismatch: "Hasła nie są zgodne",
    errTooShort: "Hasło musi mieć co najmniej 6 znaków", errIncorrect: "Aktualne hasło jest nieprawidłowe",
    errUpdateFailed: "Nie udało się zaktualizować hasła: ", errSaveFailed: "Nie udało się zapisać: ",
  },
};

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

  const t = translations[settings.language as keyof typeof translations] ?? translations.en;

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

      // Clear cache so Sidebar reloads the new photo
      sessionStorage.removeItem('profile-photo-url');
      sessionStorage.setItem('profile-photo-url', publicUrl);

      setSettings({ ...settings, teacherPhoto: publicUrl });

      // Notify other components about the update
      window.dispatchEvent(new Event('settings-updated'));
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

      // Reset to default photo and clear cache
      sessionStorage.removeItem('profile-photo-url');
      sessionStorage.setItem('profile-photo-url', '/teacher.jpg');

      setSettings({ ...settings, teacherPhoto: "/teacher.jpg" });

      // Notify other components about the update
      window.dispatchEvent(new Event('settings-updated'));
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
      if (!currentPassword) {
        setPasswordError(t.errNoCurrentPw);
        return;
      }
      if (password !== confirmPassword) {
        setPasswordError(t.errMismatch);
        return;
      }
      if (password.length < 6) {
        setPasswordError(t.errTooShort);
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
          setPasswordError(t.errIncorrect);
          setIsSaving(false);
          return;
        }

        const { error: updateError } = await supabase.auth.updateUser({
          password: password,
        });

        if (updateError) {
          setPasswordError(t.errUpdateFailed + updateError.message);
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
      setPasswordError(t.errSaveFailed + error.message);
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
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#1e293b] tracking-tight">
                  {t.title}
                </h2>
                <p className="text-[#64748b] text-xs md:text-sm mt-1 hidden sm:block">
                  {t.subtitle}
                </p>
              </div>
              <button
                onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-semibold text-sm shrink-0"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                <span className="hidden sm:inline">{t.signOut}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Success Toast */}
        {showSuccess && (
          <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in-right">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span className="text-sm font-medium">{t.success}</span>
          </div>
        )}

        {/* Content */}
        <div className="px-3 md:px-6 py-4 md:py-6">
          <div className="max-w-4xl mx-auto">
            {/* Profile Section */}
            <div className="bg-white rounded-lg border border-[#e2e8f0] p-6">
              <h3 className="text-lg font-bold text-[#1e293b] mb-6">{t.profileSection}</h3>

              <div className="flex flex-col gap-6">
                {/* Profile Photo */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    {t.profilePhoto}
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
                        {settings.teacherPhoto !== "/teacher.jpg" ? t.changePhoto : t.uploadPhoto}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-slate-500">{t.photoHint}</p>
                    </div>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t.fullName}</label>
                  <input
                    type="text"
                    value={settings.teacherName}
                    onChange={(e) =>
                      setSettings({ ...settings, teacherName: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder={t.namePlaceholder}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t.emailLabel}</label>
                  <input
                    type="email"
                    value={settings.teacherEmail}
                    readOnly
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed"
                    placeholder="your@email.com"
                  />
                  <p className="text-xs text-slate-500 mt-1">{t.emailHint}</p>
                </div>

                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t.currentPassword}</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setPasswordError("");
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder={t.currentPasswordPlaceholder}
                  />
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t.newPassword}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError("");
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder={t.newPasswordPlaceholder}
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t.confirmPassword}</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordError("");
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder={t.confirmPasswordPlaceholder}
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

            {/* Language Section */}
            <div className="mt-6 bg-white rounded-lg border border-[#e2e8f0] p-6">
              <h3 className="text-lg font-bold text-[#1e293b] mb-2">Language / Мова / Język</h3>
              <p className="text-sm text-slate-600 mb-4">{t.languageSubtitle}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { code: "en", label: "English", flag: "🇬🇧" },
                  { code: "uk", label: "Українська", flag: "🇺🇦" },
                  { code: "pl", label: "Polski", flag: "🇵🇱" },
                ].map(({ code, label, flag }) => (
                  <button
                    key={code}
                    onClick={() => setSettings({ ...settings, language: code })}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all text-left ${
                      settings.language === code
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <span className="text-2xl">{flag}</span>
                    <span className="font-medium text-sm">{label}</span>
                    {settings.language === code && (
                      <span className="material-symbols-outlined text-indigo-600 text-base ml-auto">check_circle</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Two-Factor Authentication Section */}
            <div className="mt-6 bg-white rounded-lg border border-[#e2e8f0] p-6">
              <h3 className="text-lg font-bold text-[#1e293b] mb-2">{t.twoFactorSection}</h3>
              <p className="text-sm text-slate-600 mb-6">{t.twoFactorSubtitle}</p>

              <div className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex gap-3">
                  <div className={`size-10 rounded-full flex items-center justify-center ${twoFactorEnabled ? 'bg-green-100' : 'bg-slate-200'}`}>
                    <span className={`material-symbols-outlined text-xl ${twoFactorEnabled ? 'text-green-600' : 'text-slate-500'}`}>
                      {twoFactorEnabled ? 'shield_with_heart' : 'shield'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      {twoFactorEnabled ? t.twoFactorEnabled : t.twoFactorDisabled}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">
                      {twoFactorEnabled ? t.twoFactorEnabledDesc : t.twoFactorDisabledDesc}
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
                  {twoFactorEnabled ? t.disable : t.enable}
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
              <h3 className="text-lg font-bold text-[#1e293b] mb-2">{t.sessionSection}</h3>
              <p className="text-sm text-slate-600 mb-6">{t.sessionSubtitle}</p>

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
                      <h4 className="text-sm font-semibold text-slate-900">{t.signOutAllTitle}</h4>
                      <p className="text-xs text-slate-600 mt-1">{t.signOutAllDesc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSignOutAllModal(true)}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {t.signOutAll}
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
                      <h3 className="text-lg font-bold">{t.setup2faTitle}</h3>
                      <p className="text-sm text-slate-500">{t.setup2faSubtitle}</p>
                    </div>
                  </div>

                  <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-sm text-slate-700 mb-3">{t.setup2faStep1}</p>
                    <p className="text-sm text-slate-700 mb-3">{t.setup2faStep2}</p>
                    {qrCodeUrl && (
                      <div className="flex justify-center mb-3 bg-white p-4 rounded-lg">
                        <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                      </div>
                    )}
                    <p className="text-sm text-slate-700">{t.setup2faStep3}</p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">{t.verificationCode}</label>
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
                      {t.cancel}
                    </button>
                    <button
                      onClick={handleVerifyAndEnable2FA}
                      disabled={verificationCode.length !== 6}
                      className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t.verifyAndEnable}
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
                      <h3 className="text-lg font-bold">{t.disable2faTitle}</h3>
                      <p className="text-sm text-slate-500">{t.disable2faSubtitle}</p>
                    </div>
                  </div>

                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <span className="material-symbols-outlined text-[16px] inline-block mr-1">warning</span>
                      {t.disable2faWarning}
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">{t.verificationCode}</label>
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
                      {t.cancel}
                    </button>
                    <button
                      onClick={handleConfirmDisable2FA}
                      disabled={disableVerificationCode.length !== 6}
                      className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t.disable2fa}
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
                      <h3 className="text-xl font-bold text-slate-900">{t.signOutAllModalTitle}</h3>
                      <p className="text-sm text-slate-600 mt-1">{t.signOutAllModalSubtitle}</p>
                    </div>
                  </div>

                  {/* Warning Message */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex gap-3">
                      <span className="material-symbols-outlined text-red-600 text-xl flex-shrink-0">
                        warning
                      </span>
                      <div>
                        <p className="text-sm font-medium text-red-900">{t.signOutAllWarningTitle}</p>
                        <p className="text-xs text-red-700 mt-1">{t.signOutAllWarningDesc}</p>
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
                      {t.cancel}
                    </button>
                    <button
                      onClick={handleSignOutAllDevices}
                      disabled={isSaving}
                      className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                          {t.signingOut}
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">logout</span>
                          {t.signOutAll}
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
                    {t.saving}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    {t.saveChanges}
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
