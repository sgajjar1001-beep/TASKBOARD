import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  Sun,
  CheckCircle2,
  LogIn,
  KeyRound,
  CheckSquare,
  UserPlus,
  RotateCcw,
  ArrowLeft,
  Loader2,
  Send,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Plus,
  Settings2,
  Trash2,
  Sparkles,
  Camera,
  Check,
  Briefcase,
} from 'lucide-react';
import {
  registerWithEmailPassword,
  loginWithEmailPassword,
  sendUserEmailVerification,
  checkEmailVerified,
  sendPasswordReset,
  resetPasswordWithCode,
  verifyResetCode,
  applyEmailVerificationCode,
  logoutUser,
  sendEmailOtp,
  verifyEmailOtp,
} from '../services/authService';
import {
  UserAccount,
  subscribeToAllProfiles,
  upsertFirebaseUserAccount,
  deleteProfileFromDevice,
  CRUNCHYROLL_AVATAR_GRADIENTS,
  CRUNCHYROLL_AVATAR_ICONS,
} from '../services/userService';
import { playShutterSound, playPowerOnSound, playTaskCompleteSound } from '../utils/sound';
import { auth } from '../services/firebase';
import { User } from 'firebase/auth';
import { getInitialBingWallpaper } from '../services/bingWallpaperService';

interface StartupLoginFlowProps {
  onLoginSuccess: (userName: string, isNewUser?: boolean) => void;
  defaultUserName?: string;
  muted?: boolean;
  bingWallpaperUrl?: string;
}

type ScreenView =
  | 'profiles_picker'      // Main Crunchyroll-style "Who's working?" profiles screen
  | 'profile_password'     // Selected profile password entry screen
  | 'create_profile'       // "+ Add Profile" / Create Account screen
  | 'enter_otp'            // 6-digit Email OTP verification screen
  | 'manual_signin'        // Sign In with unlisted email
  | 'forgot_password'      // Forgot password request screen
  | 'verify_pending'       // Email verification required screen
  | 'action_reset'         // Reset password link from email
  | 'greeting';            // Access granted celebration screen

export const StartupLoginFlow: React.FC<StartupLoginFlowProps> = ({
  onLoginSuccess,
  defaultUserName = '',
  muted = false,
  bingWallpaperUrl,
}) => {
  const effectiveWallpaperUrl = bingWallpaperUrl || getInitialBingWallpaper().url;
  // Screen state
  const [currentView, setCurrentView] = useState<ScreenView>('profiles_picker');
  const [profiles, setProfiles] = useState<UserAccount[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<UserAccount | null>(null);
  const [isManagingProfiles, setIsManagingProfiles] = useState<boolean>(false);

  // Form Fields
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [designation, setDesignation] = useState<string>('Team Member');
  const [selectedGradient, setSelectedGradient] = useState<string>(CRUNCHYROLL_AVATAR_GRADIENTS[0].bg);
  const [selectedIcon, setSelectedIcon] = useState<string>(CRUNCHYROLL_AVATAR_ICONS[0]);
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // 6-Digit Email OTP States
  const [otpCode, setOtpCode] = useState<string>('');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [greetingName, setGreetingName] = useState<string>('');

  // Unverified user state
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // File upload input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Email action parameters from URL
  const [actionCode, setActionCode] = useState<string | null>(null);
  const [resetEmailAccount, setResetEmailAccount] = useState<string>('');

  // Subscribe to all profiles in real-time (from Firestore + Local Cache)
  useEffect(() => {
    const unsubscribe = subscribeToAllProfiles((allProfiles) => {
      setProfiles(allProfiles);
    });
    return () => unsubscribe();
  }, []);

  // Detect email action links on mount (e.g., ?mode=verifyEmail&oobCode=... or ?mode=resetPassword&oobCode=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      const oobCode = params.get('oobCode');

      if (oobCode) {
        setActionCode(oobCode);

        if (mode === 'verifyEmail') {
          setIsLoading(true);
          applyEmailVerificationCode(oobCode).then((res) => {
            setIsLoading(false);
            if (res.success) {
              setSuccessMsg('Your email has been successfully verified! Please select your profile to sign in.');
              setCurrentView('profiles_picker');
            } else {
              setErrorMsg(res.error || 'Failed to verify email. The link may have expired.');
              setCurrentView('profiles_picker');
            }
            window.history.replaceState({}, document.title, window.location.pathname);
          });
        } else if (mode === 'resetPassword') {
          setCurrentView('action_reset');
          setIsLoading(true);
          verifyResetCode(oobCode).then((res) => {
            setIsLoading(false);
            if (res.success && res.data) {
              setResetEmailAccount(res.data);
              setSuccessMsg(`Resetting password for ${res.data}`);
            } else {
              setErrorMsg(res.error || 'Invalid or expired password reset link.');
              setCurrentView('profiles_picker');
            }
          });
        }
      }
    } catch (e) {
      console.warn('Could not parse action code from URL:', e);
    }
  }, []);

  // Cooldown countdown timer for Resend Email
  useEffect(() => {
    if (resendCooldown <= 0) {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      return;
    }

    cooldownTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, [resendCooldown]);

  // Greeting text helper
  const getGreetingText = (name: string) => {
    const hour = new Date().getHours();
    let timeGreeting = 'Good Morning';
    if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good Afternoon';
    } else if (hour >= 17 || hour < 5) {
      timeGreeting = 'Good Evening';
    }
    const cleanName = name.trim() || 'User';
    return `${timeGreeting}, ${cleanName}!`;
  };

  // Switch views cleanly
  const navigateTo = (view: ScreenView) => {
    setCurrentView(view);
    setErrorMsg('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPassword('');
  };

  // Profile click handler
  const handleSelectProfile = (profile: UserAccount) => {
    if (isManagingProfiles) return;
    setSelectedProfile(profile);
    setEmail(profile.email || '');
    setErrorMsg('');
    setSuccessMsg('');
    setPassword('');
    setCurrentView('profile_password');
    playPowerOnSound(muted);
  };

  // Delete profile from device
  const handleDeleteProfile = (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    deleteProfileFromDevice(profileId);
    setProfiles((prev) => prev.filter((p) => p.userId !== profileId));
  };

  // Handle successful authentication & proceed to Greeting
  const handleAuthGranted = (user: User, isNewUser = false) => {
    const name = selectedProfile?.username || user.displayName || user.email?.split('@')[0] || 'User';
    setGreetingName(name);

    // Save/update profile in directory
    upsertFirebaseUserAccount(user.uid, user.email, name, {
      avatarColor: selectedProfile?.avatarColor || selectedGradient,
      avatarIcon: selectedProfile?.avatarIcon || selectedIcon,
      avatarUrl: selectedProfile?.avatarUrl || customAvatarUrl || undefined,
      designation: selectedProfile?.designation || designation,
    });

    setCurrentView('greeting');
    playTaskCompleteSound(muted);

    setTimeout(() => {
      onLoginSuccess(name, isNewUser);
    }, 1500);
  };

  // 1. SIGN IN FOR SELECTED PROFILE
  const handleProfileLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail) {
      setErrorMsg('Please enter the email address for this profile.');
      return;
    }
    if (!cleanPass) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await loginWithEmailPassword(cleanEmail, cleanPass);
    setIsLoading(false);

    if (!res.success || !res.data) {
      setErrorMsg(res.error || 'Failed to sign in. Please verify your password.');
      return;
    }

    const user = res.data;

    // Check email verification
    if (!user.emailVerified) {
      setPendingUser(user);
      setCurrentView('verify_pending');
      setErrorMsg('');
      setSuccessMsg(`A verification link was sent to ${user.email}. Please verify your email before entering.`);
      return;
    }

    handleAuthGranted(user, false);
  };

  // 2. CREATE NEW PROFILE: REQUEST 6-DIGIT EMAIL OTP
  const handleCreateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    const cleanEmail = email.trim();
    const cleanPass = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanName) {
      setErrorMsg('Please enter your Profile Name.');
      return;
    }
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!cleanPass || cleanPass.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (cleanPass !== cleanConfirm) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Request genuine 6-digit OTP from backend
    const otpRes = await sendEmailOtp(cleanEmail, cleanName);
    setIsLoading(false);

    if (!otpRes.success) {
      setErrorMsg(otpRes.error || 'Failed to send verification code. Please check your email.');
      return;
    }

    setDevOtpHint(otpRes.devOtp || null);
    setOtpCode('');
    setResendCooldown(60);
    setCurrentView('enter_otp');
    setSuccessMsg(
      otpRes.emailDispatched
        ? `We have sent a 6-digit verification code to ${cleanEmail}.`
        : `6-Digit verification code generated! Enter the code below to complete setup.`
    );
  };

  // 2B. VERIFY 6-DIGIT OTP AND COMPLETE REGISTRATION
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpCode.trim().replace(/\D/g, '');
    const cleanEmail = email.trim();
    const cleanPass = password.trim();
    const cleanName = fullName.trim();

    if (cleanOtp.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Step 1: Verify OTP code with backend
    const verifyRes = await verifyEmailOtp(cleanEmail, cleanOtp);
    if (!verifyRes.success || !verifyRes.verified) {
      setIsLoading(false);
      setErrorMsg(verifyRes.error || 'Invalid or expired verification code. Please try again.');
      return;
    }

    // Step 2: Register user with Firebase Auth & create account
    const authRes = await registerWithEmailPassword(cleanEmail, cleanPass, cleanName);
    setIsLoading(false);

    if (!authRes.success || !authRes.data) {
      // If user already exists in Firebase Auth, attempt login
      const loginRes = await loginWithEmailPassword(cleanEmail, cleanPass);
      if (loginRes.success && loginRes.data) {
        handleAuthGranted(loginRes.data, false);
        return;
      }
      setErrorMsg(authRes.error || 'Email verified with OTP, but account registration failed. Please try signing in.');
      return;
    }

    const user = authRes.data;
    setPendingUser(user);

    // Save profile representation immediately to directory
    const newProfile = upsertFirebaseUserAccount(user.uid, user.email, cleanName, {
      avatarColor: selectedGradient,
      avatarIcon: selectedIcon,
      avatarUrl: customAvatarUrl || undefined,
      designation: designation.trim() || 'Team Member',
    });
    setSelectedProfile(newProfile);

    // Grant access directly since OTP verified their email identity!
    handleAuthGranted(user, true);
  };

  // Resend 6-Digit OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setIsLoading(true);
    setErrorMsg('');
    const cleanEmail = email.trim();
    const cleanName = fullName.trim();

    const otpRes = await sendEmailOtp(cleanEmail, cleanName);
    setIsLoading(false);

    if (otpRes.success) {
      setDevOtpHint(otpRes.devOtp || null);
      setResendCooldown(60);
      setSuccessMsg(`A fresh 6-digit verification code has been sent to ${cleanEmail}.`);
    } else {
      setErrorMsg(otpRes.error || 'Could not resend code. Please try again shortly.');
    }
  };

  // 3. MANUAL SIGN IN SUBMIT (FOR UNLISTED EMAIL)
  const handleManualSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      setErrorMsg('Email and Password are required.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    const res = await loginWithEmailPassword(cleanEmail, cleanPass);
    setIsLoading(false);

    if (!res.success || !res.data) {
      setErrorMsg(res.error || 'Sign in failed. Check credentials.');
      return;
    }

    const user = res.data;
    if (!user.emailVerified) {
      setPendingUser(user);
      setCurrentView('verify_pending');
      setSuccessMsg(`Please verify your email address at ${user.email}.`);
      return;
    }

    handleAuthGranted(user, false);
  };

  // 4. FORGOT PASSWORD SUBMIT
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await sendPasswordReset(cleanEmail);
    setIsLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Could not send reset email. Check email address.');
      return;
    }

    setSuccessMsg(`Password reset link sent to ${cleanEmail}. Please check your inbox.`);
  };

  // 5. ACTION CODE PASSWORD RESET SUBMIT
  const handleActionResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionCode) {
      setErrorMsg('Missing password reset action code.');
      return;
    }

    const cleanPass = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanPass || cleanPass.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (cleanPass !== cleanConfirm) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    const res = await resetPasswordWithCode(actionCode, cleanPass);
    setIsLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to update password. Code may have expired.');
      return;
    }

    window.history.replaceState({}, document.title, window.location.pathname);
    setSuccessMsg('Password updated successfully! Select your profile to sign in.');
    setCurrentView('profiles_picker');
  };

  // 6. RESEND VERIFICATION EMAIL
  const handleResendVerification = async () => {
    if (resendCooldown > 0 || isLoading) return;

    setIsLoading(true);
    setErrorMsg('');

    const res = await sendUserEmailVerification(pendingUser || auth.currentUser);
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg('A new verification email has been sent.');
      setResendCooldown(60);
    } else {
      setErrorMsg(res.error || 'Could not resend email. Please try again in a minute.');
    }
  };

  // 7. CHECK IF EMAIL IS VERIFIED
  const handleCheckEmailVerified = async () => {
    setIsLoading(true);
    setErrorMsg('');

    const verified = await checkEmailVerified(pendingUser || auth.currentUser);
    setIsLoading(false);

    if (verified && (pendingUser || auth.currentUser)) {
      const active = auth.currentUser || pendingUser;
      if (active) {
        handleAuthGranted(active, false);
      }
    } else {
      setErrorMsg('Your email is not verified yet. Please check your inbox and spam folder for the link.');
    }
  };

  // Avatar file upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('Please choose an image under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setCustomAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-transparent text-slate-900 dark:text-white font-sans select-none p-4 sm:p-6">
      {/* Microsoft Bing Daily Wallpaper Background Layer */}
      {effectiveWallpaperUrl && (
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0 transition-all duration-700"
          style={{ backgroundImage: `url(${effectiveWallpaperUrl})` }}
        />
      )}

      {/* Subtle translucent dark glass backdrop - ensures 100% wallpaper visibility while keeping cards & text readable */}
      <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[1.5px] pointer-events-none z-0" />

      {/* Top Brand Banner */}
      <div className="fixed top-6 left-6 z-40 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-white/30 dark:bg-black/40 backdrop-blur-md border border-white/40 dark:border-white/20 p-1 shadow-sm flex items-center justify-center text-[#1a73e8] dark:text-[#8ab4f8]">
          <CheckSquare className="w-5 h-5 stroke-[2.4]" />
        </div>
        <div>
          <span className="block text-sm font-black tracking-wider text-slate-950 dark:text-white drop-shadow-xs">
            WORK <span className="text-[#1a73e8] dark:text-[#8ab4f8]">BOARD</span>
          </span>
          <span className="block text-[10px] text-slate-800 dark:text-slate-200 font-extrabold tracking-wider uppercase drop-shadow-2xs">
            Productivity Workspace
          </span>
        </div>
      </div>

      {/* ========================================================
          1. PROFILES SELECTION SCREEN (Crunchyroll Style • Transparent Glass Theme)
         ======================================================== */}
      {currentView === 'profiles_picker' && (
        <div className="relative z-30 w-full max-w-4xl mx-auto flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-400 py-12">
          {/* Header */}
          <div className="mb-10 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/40 dark:bg-white/10 backdrop-blur-md border border-white/40 dark:border-white/20 text-[#1a73e8] dark:text-[#8ab4f8] text-xs font-black tracking-wider uppercase mb-3 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#1a73e8] dark:text-[#8ab4f8]" />
              <span>Multi-User Workspace</span>
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-950 dark:text-white tracking-tight drop-shadow-[0_2px_15px_rgba(0,0,0,0.6)]">
              Who's working?
            </h1>
            <p className="text-sm sm:text-base text-slate-900 dark:text-slate-100 mt-2 font-extrabold max-w-md mx-auto drop-shadow-xs">
              Select your profile to launch your personal workspace and task board.
            </p>
          </div>

          {/* Error / Success Feedback */}
          {errorMsg && (
            <div className="mb-6 px-4 py-3 rounded-2xl bg-rose-500/20 border border-rose-400/40 backdrop-blur-md text-rose-950 dark:text-rose-100 text-xs font-bold max-w-md w-full flex items-center gap-2.5 shadow-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-6 px-4 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 backdrop-blur-md text-emerald-950 dark:text-emerald-100 text-xs font-bold max-w-md w-full flex items-center gap-2.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Crunchyroll-Style Profile Cards Grid in Transparent Glass Theme */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 md:gap-10 max-w-3xl px-4">
            {/* Existing Profiles */}
            {profiles.map((profile) => {
              const bgGradient = profile.avatarColor || 'from-[#1a73e8] to-[#4285f4]';
              const iconSticker = profile.avatarIcon || '⚡';
              const firstLetter = profile.username.charAt(0).toUpperCase();

              return (
                <div
                  key={profile.userId}
                  onClick={() => handleSelectProfile(profile)}
                  className="group relative flex flex-col items-center cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95"
                >
                  {/* Delete Badge when in Manage Mode */}
                  {isManagingProfiles && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteProfile(e, profile.userId)}
                      className="absolute -top-2 -right-2 z-20 w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md border-2 border-white transition-transform hover:scale-110 cursor-pointer"
                      title="Remove profile from this device"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Profile Avatar Card (Squircle) */}
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1 bg-white/35 dark:bg-black/40 backdrop-blur-xl border-2 border-white/45 dark:border-white/20 group-hover:border-[#1a73e8] shadow-xl group-hover:shadow-[0_12px_30px_rgba(26,115,232,0.3)] transition-all duration-300 overflow-hidden">
                    <div
                      className={`w-full h-full rounded-[20px] bg-gradient-to-br ${bgGradient} flex flex-col items-center justify-center relative overflow-hidden shadow-xs`}
                    >
                      {/* Avatar Image OR Clean Initial/Sticker */}
                      {profile.avatarUrl ? (
                        <img
                          src={profile.avatarUrl}
                          alt={profile.username}
                          className="w-full h-full object-cover rounded-[20px]"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-white drop-shadow-sm">
                          <span className="text-3xl sm:text-4xl mb-0.5 filter drop-shadow">
                            {iconSticker}
                          </span>
                          <span className="text-xs font-black tracking-wider uppercase opacity-95">
                            {firstLetter}
                          </span>
                        </div>
                      )}

                      {/* Subtle glossy sheen */}
                      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none rounded-t-[20px]" />
                    </div>
                  </div>

                  {/* Profile Name & Tag */}
                  <div className="mt-3 text-center">
                    <span className="block text-sm sm:text-base font-black text-slate-950 dark:text-white group-hover:text-[#1a73e8] transition-colors truncate max-w-[130px] drop-shadow-xs">
                      {profile.username}
                    </span>
                    <span className="inline-block text-[11px] text-slate-900 dark:text-slate-100 font-extrabold bg-white/45 dark:bg-white/10 border border-white/40 dark:border-white/20 px-2.5 py-0.5 rounded-full mt-1 max-w-[130px] truncate shadow-2xs backdrop-blur-xs">
                      {profile.designation || 'Team Member'}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Empty state hint */}
            {profiles.length === 0 && (
              <div className="w-full text-center pb-2">
                <p className="text-xs text-slate-800 dark:text-slate-200 font-extrabold">
                  No profiles saved on this device yet. Tap <span className="text-[#1a73e8] dark:text-[#8ab4f8] font-black underline">+ Add Profile</span> to create your first workspace profile!
                </p>
              </div>
            )}

            {/* "+ Add Profile" Tile */}
            <div
              onClick={() => {
                setFullName('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setDesignation('Team Member');
                setCustomAvatarUrl('');
                navigateTo('create_profile');
              }}
              className="group flex flex-col items-center cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl border-2 border-dashed border-white/60 dark:border-white/30 group-hover:border-[#1a73e8] bg-white/30 dark:bg-black/40 backdrop-blur-xl group-hover:bg-white/45 flex flex-col items-center justify-center transition-all duration-300 shadow-xl group-hover:shadow-[0_10px_25px_rgba(26,115,232,0.25)]">
                <div className="w-12 h-12 rounded-2xl bg-white/50 dark:bg-white/20 text-[#1a73e8] dark:text-[#8ab4f8] flex items-center justify-center transition-colors shadow-2xs">
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </div>
              </div>

              <div className="mt-3 text-center">
                <span className="block text-sm sm:text-base font-black text-slate-950 dark:text-white group-hover:text-[#1a73e8] transition-colors drop-shadow-xs">
                  Add Profile
                </span>
                <span className="block text-[11px] text-slate-900 dark:text-slate-100 font-bold drop-shadow-2xs">
                  Create Account
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Action Controls */}
          <div className="mt-12 sm:mt-14 flex flex-wrap items-center justify-center gap-3.5 text-xs font-semibold">
            {/* Manage Profiles Toggle */}
            {profiles.length > 0 && (
              <button
                type="button"
                onClick={() => setIsManagingProfiles(!isManagingProfiles)}
                className={`px-5 py-2.5 rounded-full border transition-all cursor-pointer flex items-center gap-2 shadow-sm backdrop-blur-md ${
                  isManagingProfiles
                    ? 'bg-[#1a73e8] border-[#1a73e8] text-white shadow-md shadow-blue-500/25 font-black'
                    : 'bg-white/35 dark:bg-black/35 hover:bg-white/50 dark:hover:bg-black/50 border-white/45 dark:border-white/20 text-slate-950 dark:text-white font-extrabold'
                }`}
              >
                <Settings2 className="w-4 h-4" />
                <span>{isManagingProfiles ? 'Done Managing' : 'Manage Profiles'}</span>
              </button>
            )}

            {/* Manual Sign In with another Email */}
            <button
              type="button"
              onClick={() => {
                setEmail('');
                setPassword('');
                navigateTo('manual_signin');
              }}
              className="px-5 py-2.5 rounded-full bg-white/35 dark:bg-black/35 hover:bg-white/50 dark:hover:bg-black/50 border border-white/45 dark:border-white/20 text-[#1a73e8] dark:text-[#8ab4f8] font-black transition-all cursor-pointer flex items-center gap-2 shadow-sm hover:shadow-md backdrop-blur-md"
            >
              <LogIn className="w-4 h-4 text-[#1a73e8] dark:text-[#8ab4f8]" />
              <span>Sign In with Other Email</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          2. PASSWORD ENTRY FOR SELECTED PROFILE
         ======================================================== */}
      {currentView === 'profile_password' && selectedProfile && (
        <div className="relative z-30 w-full max-w-sm mx-auto animate-in zoom-in-95 fade-in duration-300">
          <div className="bg-white/35 dark:bg-black/45 backdrop-blur-2xl border-2 border-white/45 dark:border-white/20 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] p-6 sm:p-8 text-slate-950 dark:text-white relative">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => navigateTo('profiles_picker')}
              className="absolute top-5 left-5 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white p-1.5 rounded-xl hover:bg-white/25 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Back to Profiles"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Centered Profile Avatar */}
            <div className="flex flex-col items-center text-center mt-2 mb-6">
              <div className="relative w-24 h-24 rounded-3xl p-1 bg-white/40 dark:bg-black/40 backdrop-blur-md border-2 border-[#1a73e8] shadow-[0_8px_25px_rgba(26,115,232,0.3)] mb-3">
                <div
                  className={`w-full h-full rounded-[20px] bg-gradient-to-br ${
                    selectedProfile.avatarColor || 'from-[#1a73e8] to-[#4285f4]'
                  } flex items-center justify-center overflow-hidden`}
                >
                  {selectedProfile.avatarUrl ? (
                    <img
                      src={selectedProfile.avatarUrl}
                      alt={selectedProfile.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl filter drop-shadow">
                      {selectedProfile.avatarIcon || '⚡'}
                    </span>
                  )}
                </div>
              </div>

              <h2 className="text-xl font-black text-slate-950 dark:text-white tracking-tight drop-shadow-xs">
                Welcome, {selectedProfile.username}!
              </h2>
              <span className="text-xs text-slate-800 dark:text-slate-200 font-extrabold mt-0.5">
                {selectedProfile.designation || 'Team Member'}
              </span>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-500/20 border border-rose-400/40 backdrop-blur-md text-xs text-rose-950 dark:text-rose-100 font-bold flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleProfileLoginSubmit} className="space-y-4">
              {/* Email (Auto-filled or editable) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#1a73e8] dark:text-[#8ab4f8]" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full px-4 py-2.5 bg-white/65 dark:bg-black/40 hover:bg-white/80 dark:hover:bg-black/60 focus:bg-white dark:focus:bg-zinc-900 border border-white/50 dark:border-white/25 rounded-2xl text-sm text-slate-950 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-400 focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/30 transition-all font-sans font-bold shadow-xs backdrop-blur-sm"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#1a73e8] dark:text-[#8ab4f8]" />
                    <span>Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => navigateTo('forgot_password')}
                    className="text-[11px] font-black text-[#1a73e8] dark:text-[#8ab4f8] hover:underline cursor-pointer"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoFocus
                    required
                    className="w-full px-4 py-2.5 pr-10 bg-white/65 dark:bg-black/40 hover:bg-white/80 dark:hover:bg-black/60 focus:bg-white dark:focus:bg-zinc-900 border border-white/50 dark:border-white/25 rounded-2xl text-sm text-slate-950 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-400 focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/30 transition-all font-sans font-bold shadow-xs backdrop-blur-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Unlock / Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold text-sm shadow-md shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center mt-5">
              <button
                type="button"
                onClick={() => navigateTo('profiles_picker')}
                className="text-xs text-[#5f6368] hover:text-[#1a73e8] font-medium transition-colors cursor-pointer"
              >
                Switch to another profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          3. CREATE NEW PROFILE (+ ADD PROFILE FLOW)
         ======================================================== */}
      {currentView === 'create_profile' && (
        <div className="relative z-30 w-full max-w-lg mx-auto animate-in zoom-in-95 fade-in duration-300">
          <div className="bg-white/40 dark:bg-black/45 backdrop-blur-2xl border-2 border-white/50 dark:border-white/20 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] p-6 sm:p-8 text-slate-950 dark:text-white relative">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/30 dark:border-white/10 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigateTo('profiles_picker')}
                  className="text-slate-800 dark:text-slate-200 hover:text-black dark:hover:text-white p-1.5 rounded-xl hover:bg-white/40 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Back to Profiles"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-950 dark:text-white leading-tight">
                    Create Workspace Profile
                  </h3>
                  <span className="text-[11px] text-blue-700 dark:text-blue-400 font-extrabold tracking-wide">
                    MULTI-USER PROFILES SETUP
                  </span>
                </div>
              </div>
            </div>

            {/* Error Feedback */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-500/20 backdrop-blur-md border border-rose-500/40 text-xs text-rose-950 dark:text-rose-200 font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateProfileSubmit} className="space-y-4">
              {/* Profile Avatar Customizer Preview */}
              <div className="p-4 rounded-2xl bg-white/30 dark:bg-black/30 backdrop-blur-md border border-white/40 dark:border-white/15 flex flex-col items-center">
                <div className="relative w-20 h-20 rounded-2xl p-0.5 bg-white/60 dark:bg-black/50 border-2 border-white/60 dark:border-white/20 shadow-md mb-3">
                  <div
                    className={`w-full h-full rounded-[14px] bg-gradient-to-br ${selectedGradient} flex items-center justify-center overflow-hidden`}
                  >
                    {customAvatarUrl ? (
                      <img src={customAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl filter drop-shadow">{selectedIcon}</span>
                    )}
                  </div>

                  {/* Photo upload trigger */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110"
                    title="Upload Custom Photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Choose Color Theme & Avatar Icon
                </span>

                {/* Color Palette Selector */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 mb-2.5">
                  {CRUNCHYROLL_AVATAR_GRADIENTS.map((grad) => (
                    <button
                      key={grad.id}
                      type="button"
                      onClick={() => {
                        setSelectedGradient(grad.bg);
                        setCustomAvatarUrl('');
                      }}
                      className={`w-6 h-6 rounded-full bg-gradient-to-br ${grad.bg} transition-all cursor-pointer flex items-center justify-center ${
                        selectedGradient === grad.bg && !customAvatarUrl
                          ? 'ring-2 ring-[#1a73e8] scale-110 shadow-xs'
                          : 'opacity-75 hover:opacity-100'
                      }`}
                      title={grad.name}
                    >
                      {selectedGradient === grad.bg && !customAvatarUrl && (
                        <Check className="w-3 h-3 text-white stroke-[3]" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Icon Sticker Selector */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-xs">
                  {CRUNCHYROLL_AVATAR_ICONS.slice(0, 10).map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => {
                        setSelectedIcon(icon);
                        setCustomAvatarUrl('');
                      }}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-sm transition-all cursor-pointer ${
                        selectedIcon === icon && !customAvatarUrl
                          ? 'bg-white/90 dark:bg-black/90 border-2 border-[#1a73e8] scale-110 shadow-xs'
                          : 'bg-white/60 dark:bg-black/40 border border-white/50 dark:border-white/20 hover:bg-white dark:hover:bg-black/60'
                      }`}
                    >
                      <span>{icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-[#1a73e8]" />
                    <span>Profile Name</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sumit"
                    required
                    autoFocus
                    className="w-full px-3.5 py-2.5 bg-white/70 dark:bg-black/45 hover:bg-white dark:hover:bg-black/60 focus:bg-white dark:focus:bg-zinc-900 border border-white/60 dark:border-white/20 rounded-2xl text-sm text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all font-sans font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#1a73e8]" />
                    <span>Role / Designation</span>
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Operations Manager"
                    className="w-full px-3.5 py-2.5 bg-white/70 dark:bg-black/45 hover:bg-white dark:hover:bg-black/60 focus:bg-white dark:focus:bg-zinc-900 border border-white/60 dark:border-white/20 rounded-2xl text-sm text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all font-sans font-semibold"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#1a73e8]" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full px-3.5 py-2.5 bg-white/70 dark:bg-black/45 hover:bg-white dark:hover:bg-black/60 focus:bg-white dark:focus:bg-zinc-900 border border-white/60 dark:border-white/20 rounded-2xl text-sm text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all font-sans font-semibold"
                />
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#1a73e8]" />
                    <span>Password (min. 6)</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    minLength={6}
                    className="w-full px-3.5 py-2.5 bg-white/70 dark:bg-black/45 hover:bg-white dark:hover:bg-black/60 focus:bg-white dark:focus:bg-zinc-900 border border-white/60 dark:border-white/20 rounded-2xl text-sm text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all font-sans font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#1a73e8]" />
                    <span>Confirm Password</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm"
                    required
                    className="w-full px-3.5 py-2.5 bg-white/70 dark:bg-black/45 hover:bg-white dark:hover:bg-black/60 focus:bg-white dark:focus:bg-zinc-900 border border-white/60 dark:border-white/20 rounded-2xl text-sm text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all font-sans font-semibold"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending 6-Digit OTP...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Create Profile & Get 6-Digit OTP</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          3B. ENTER 6-DIGIT EMAIL OTP SCREEN
         ======================================================== */}
      {currentView === 'enter_otp' && (
        <div className="relative z-30 w-full max-w-sm mx-auto animate-in zoom-in-95 fade-in duration-300">
          <div className="bg-white/40 dark:bg-black/45 backdrop-blur-2xl border-2 border-white/50 dark:border-white/20 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] p-6 sm:p-8 text-slate-950 dark:text-white relative text-center">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => navigateTo('create_profile')}
              className="absolute top-5 left-5 text-slate-800 dark:text-slate-200 hover:text-black dark:hover:text-white p-1.5 rounded-xl hover:bg-white/40 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Icon & Title */}
            <div className="w-16 h-16 rounded-3xl bg-blue-500/20 backdrop-blur-md border border-blue-400/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
            </div>

            <h3 className="text-xl font-black text-slate-950 dark:text-white mb-1.5 tracking-tight">
              Enter 6-Digit OTP
            </h3>
            <p className="text-xs text-slate-800 dark:text-slate-300 font-semibold leading-relaxed mb-5">
              We sent a 6-digit verification code to <strong className="text-slate-950 dark:text-white underline">{email}</strong>
            </p>

            {/* Test OTP Hint Badge (when in dev mode or before Resend API key is set) */}
            {devOtpHint && (
              <div className="mb-4 p-2.5 rounded-xl bg-amber-500/20 backdrop-blur-md border border-amber-400/40 text-amber-950 dark:text-amber-200 text-xs font-bold flex items-center justify-between">
                <span>Dev Test Code:</span>
                <span className="font-mono text-sm tracking-widest bg-white/80 dark:bg-black/60 px-2 py-0.5 rounded-lg border border-amber-300 font-black text-blue-600 dark:text-blue-400">
                  {devOtpHint}
                </span>
              </div>
            )}

            {/* Error & Success Messages */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-500/20 backdrop-blur-md border border-rose-500/40 text-xs text-rose-950 dark:text-rose-200 font-bold flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 text-xs text-emerald-950 dark:text-emerald-200 font-bold flex items-center gap-2 text-left">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* OTP Form */}
            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center justify-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#1a73e8]" />
                  <span>Verification Code</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpCode(val);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="000000"
                  autoFocus
                  required
                  className="w-full text-center text-3xl font-mono font-black tracking-[0.5em] px-4 py-3 bg-white/70 dark:bg-black/45 focus:bg-white dark:focus:bg-zinc-900 border-2 border-white/60 dark:border-white/20 focus:border-[#1a73e8] rounded-2xl focus:ring-4 focus:ring-[#1a73e8]/15 text-slate-950 dark:text-white transition-all shadow-inner placeholder:text-slate-400"
                />
              </div>

              {/* Verify OTP Button */}
              <button
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                className="w-full py-3.5 rounded-2xl bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify OTP & Launch Profile</span>
                  </>
                )}
              </button>

              {/* Resend OTP Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isLoading}
                  className="w-full py-2.5 rounded-xl border border-white/60 dark:border-white/20 bg-white/50 dark:bg-black/35 hover:bg-white/80 dark:hover:bg-black/60 text-xs font-bold text-slate-900 dark:text-slate-200 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                >
                  <Send className="w-3.5 h-3.5 text-[#1a73e8]" />
                  <span>
                    {resendCooldown > 0
                      ? `Resend Code in ${resendCooldown}s`
                      : 'Resend Verification Code'}
                  </span>
                </button>
              </div>

              {/* Change Email Link */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => navigateTo('create_profile')}
                  className="text-xs text-slate-800 dark:text-slate-300 hover:text-[#1a73e8] font-bold transition-colors cursor-pointer"
                >
                  Entered wrong email? Change email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          4. MANUAL SIGN IN (FOR UNLISTED EMAIL)
         ======================================================== */}
      {currentView === 'manual_signin' && (
        <div className="relative z-30 w-full max-w-sm mx-auto animate-in zoom-in-95 fade-in duration-300">
          <div className="bg-white/40 dark:bg-black/45 backdrop-blur-2xl border-2 border-white/50 dark:border-white/20 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] p-6 sm:p-8 text-slate-950 dark:text-white relative">
            <button
              type="button"
              onClick={() => navigateTo('profiles_picker')}
              className="absolute top-5 left-5 text-slate-800 dark:text-slate-200 hover:text-black dark:hover:text-white p-1.5 rounded-xl hover:bg-white/40 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="text-center mt-2 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 backdrop-blur-md border border-blue-400/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <LogIn className="w-6 h-6 stroke-[2.4]" />
              </div>
              <h2 className="text-xl font-black text-slate-950 dark:text-white">Manual Sign In</h2>
              <p className="text-xs text-slate-800 dark:text-slate-300 font-semibold mt-1">Sign in with any existing Firebase account</p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-500/20 backdrop-blur-md border border-rose-500/40 text-xs text-rose-950 dark:text-rose-200 font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleManualSignInSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#1a73e8]" />
                  <span>Email</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 bg-white/70 dark:bg-black/45 hover:bg-white dark:hover:bg-black/60 focus:bg-white dark:focus:bg-zinc-900 border border-white/60 dark:border-white/20 rounded-2xl text-sm text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all font-sans font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#1a73e8]" />
                    <span>Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => navigateTo('forgot_password')}
                    className="text-[11px] font-black text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="w-full px-4 py-2.5 pr-10 bg-white/70 dark:bg-black/45 hover:bg-white dark:hover:bg-black/60 focus:bg-white dark:focus:bg-zinc-900 border border-white/60 dark:border-white/20 rounded-2xl text-sm text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all font-sans font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          5. EMAIL VERIFICATION REQUIRED SCREEN
         ======================================================== */}
      {currentView === 'verify_pending' && (
        <div className="relative z-30 w-full max-w-md mx-auto animate-in zoom-in-95 fade-in duration-300">
          <div className="bg-white/40 dark:bg-black/45 backdrop-blur-2xl border-2 border-white/50 dark:border-white/20 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] p-6 sm:p-8 text-slate-950 dark:text-white relative text-center">
            <div className="w-16 h-16 rounded-3xl bg-blue-500/20 backdrop-blur-md border border-blue-400/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Mail className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black text-slate-950 dark:text-white mb-2">
              Verify your email address
            </h3>
            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-semibold leading-relaxed mb-6">
              We have sent a secure verification link to{' '}
              <strong className="text-slate-950 dark:text-white underline">{pendingUser?.email || email}</strong>. Please check
              your inbox (or spam) and click the link to activate your workspace profile.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-500/20 backdrop-blur-md border border-rose-500/40 text-xs text-rose-950 dark:text-rose-200 font-bold flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 text-xs text-emerald-950 dark:text-emerald-200 font-bold flex items-center gap-2 text-left">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleCheckEmailVerified}
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Checking Status...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>I have verified my email</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendCooldown > 0 || isLoading}
                className="w-full py-2.5 rounded-2xl bg-white/50 dark:bg-black/35 hover:bg-white/80 dark:hover:bg-black/60 border border-white/60 dark:border-white/20 text-xs font-bold text-slate-900 dark:text-slate-200 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-[#1a73e8]" />
                <span>
                  {resendCooldown > 0
                    ? `Resend available in ${resendCooldown}s`
                    : 'Resend Verification Email'}
                </span>
              </button>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={async () => {
                  await logoutUser();
                  navigateTo('profiles_picker');
                }}
                className="text-xs text-slate-800 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer font-bold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cancel & Back to Profiles</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          6. FORGOT PASSWORD REQUEST
         ======================================================== */}
      {currentView === 'forgot_password' && (
        <div className="relative z-30 w-full max-w-sm mx-auto animate-in zoom-in-95 fade-in duration-300">
          <div className="bg-white/40 dark:bg-black/45 backdrop-blur-2xl border-2 border-white/50 dark:border-white/20 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] p-6 sm:p-8 text-slate-950 dark:text-white relative">
            <button
              type="button"
              onClick={() => navigateTo('profiles_picker')}
              className="absolute top-5 left-5 text-slate-800 dark:text-slate-200 hover:text-black dark:hover:text-white p-1.5 rounded-xl hover:bg-white/40 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="text-center mt-2 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 backdrop-blur-md border border-amber-400/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <RotateCcw className="w-6 h-6 stroke-[2.4]" />
              </div>
              <h2 className="text-xl font-black text-slate-950 dark:text-white">Reset Password</h2>
              <p className="text-xs text-slate-800 dark:text-slate-300 font-semibold mt-1">We'll send a secure Firebase reset link</p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-500/20 backdrop-blur-md border border-rose-500/40 text-xs text-rose-950 dark:text-rose-200 font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 text-xs text-emerald-950 dark:text-emerald-200 font-bold flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 bg-white/70 dark:bg-black/45 hover:bg-white dark:hover:bg-black/60 focus:bg-white dark:focus:bg-zinc-900 border border-white/60 dark:border-white/20 rounded-2xl text-sm text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-sans font-semibold"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-lg shadow-amber-600/25 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Link...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Reset Email</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          7. ACTION CODE: NEW PASSWORD ENTRY (FROM EMAIL LINK)
         ======================================================== */}
      {currentView === 'action_reset' && (
        <div className="relative z-30 w-full max-w-sm mx-auto animate-in zoom-in-95 fade-in duration-300">
          <div className="bg-white/40 dark:bg-black/45 backdrop-blur-2xl border-2 border-white/50 dark:border-white/20 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] p-6 sm:p-8 text-slate-950 dark:text-white relative">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 backdrop-blur-md border border-blue-400/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <KeyRound className="w-6 h-6 stroke-[2.4]" />
              </div>
              <h2 className="text-xl font-black text-slate-950 dark:text-white">Set New Password</h2>
              <p className="text-xs text-slate-800 dark:text-slate-300 font-semibold mt-1">
                For account: <strong className="text-slate-950 dark:text-white underline">{resetEmailAccount}</strong>
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-500/20 backdrop-blur-md border border-rose-500/40 text-xs text-rose-950 dark:text-rose-200 font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleActionResetSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#1a73e8]" />
                  <span>New Password</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  autoFocus
                  className="w-full px-4 py-2.5 bg-white/70 dark:bg-black/45 hover:bg-white dark:hover:bg-black/60 focus:bg-white dark:focus:bg-zinc-900 border border-white/60 dark:border-white/20 rounded-2xl text-sm text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all font-sans font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#1a73e8]" />
                  <span>Confirm New Password</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  className="w-full px-4 py-2.5 bg-white/70 dark:bg-black/45 hover:bg-white dark:hover:bg-black/60 focus:bg-white dark:focus:bg-zinc-900 border border-white/60 dark:border-white/20 rounded-2xl text-sm text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all font-sans font-semibold"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Save New Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          8. GREETING CELEBRATION SCREEN
         ======================================================== */}
      {currentView === 'greeting' && (
        <div className="relative z-50 flex flex-col items-center justify-center text-center p-6 animate-in zoom-in-95 fade-in duration-500">
          <div className="relative mb-5">
            <div className="absolute -inset-5 rounded-full bg-amber-400/20 blur-xl animate-pulse pointer-events-none" />
            <div className="w-20 h-20 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/15 ring-4 ring-amber-100 animate-bounce">
              <Sun className="w-10 h-10 stroke-[2.2]" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider mb-3 bg-[#e6f4ea] border border-[#ceead6] text-[#137333]">
            <CheckCircle2 className="w-4 h-4 text-current" />
            <span>EMAIL VERIFIED & ACCESS GRANTED</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#202124] tracking-tight mb-2 drop-shadow-2xs">
            {getGreetingText(greetingName || defaultUserName)}
          </h1>

          <p className="text-sm text-[#5f6368] font-medium max-w-sm mb-6">
            Opening your personal task workspace...
          </p>

          <div className="w-56 h-2 bg-[#dadce0] rounded-full overflow-hidden p-0.5">
            <div className="h-full bg-gradient-to-r from-[#1a73e8] via-[#4285f4] to-emerald-500 rounded-full w-full animate-in slide-from-left duration-1500" />
          </div>
        </div>
      )}
    </div>
  );
};
