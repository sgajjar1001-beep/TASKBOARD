import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  applyActionCode,
  updateProfile,
  onAuthStateChanged,
  reload,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User,
} from 'firebase/auth';
import { auth } from './firebase';

export interface AuthResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Maps Firebase Auth error codes to user-friendly messages
 */
export function mapAuthErrorToMessage(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const code = error.code || '';
  const message = error.message || '';

  switch (code) {
    case 'auth/invalid-email':
      return 'The email address is invalid. Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account exists with this email address. Please check your email or sign up.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again or use "Forgot Password".';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please verify your login credentials.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address. Please log in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a password with at least 6 characters.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled in Firebase Console. Please enable it under Authentication > Sign-in method.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Access has been temporarily locked for security. Please try again later or reset your password.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection.';
    case 'auth/requires-recent-login':
      return 'This operation is sensitive and requires a recent login. Please log in again.';
    case 'auth/expired-action-code':
      return 'This verification or reset link has expired. Please request a new one.';
    case 'auth/invalid-action-code':
      return 'This verification or reset link is invalid or has already been used.';
    default:
      if (message.includes('email-already-in-use')) {
        return 'An account with this email already exists.';
      }
      return message || 'Authentication failed. Please try again.';
  }
}

/**
 * Register a new user with Email and Password
 * Automatically sets displayName and sends email verification.
 */
export async function registerWithEmailPassword(
  email: string,
  pass: string,
  fullName: string
): Promise<AuthResponse<User>> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim() || cleanEmail.split('@')[0];

    if (!cleanEmail) {
      return { success: false, error: 'Email address is required.' };
    }
    if (!pass || pass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    const user = userCredential.user;

    // Update display name
    try {
      await updateProfile(user, { displayName: cleanName });
    } catch (profileErr) {
      console.warn('Could not set displayName on Firebase Auth:', profileErr);
    }

    // Send verification email
    try {
      await sendEmailVerification(user);
    } catch (verifyErr) {
      console.warn('Failed to send verification email during signup:', verifyErr);
    }

    return { success: true, data: user };
  } catch (error: any) {
    return {
      success: false,
      error: mapAuthErrorToMessage(error),
      code: error?.code,
    };
  }
}

/**
 * Log in an existing user with Email and Password
 */
export async function loginWithEmailPassword(
  email: string,
  pass: string
): Promise<AuthResponse<User>> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Email address is required.' };
    }
    if (!pass) {
      return { success: false, error: 'Password is required.' };
    }

    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const user = userCredential.user;

    return { success: true, data: user };
  } catch (error: any) {
    return {
      success: false,
      error: mapAuthErrorToMessage(error),
      code: error?.code,
    };
  }
}

/**
 * Send email verification to the currently logged in user
 */
export async function sendUserEmailVerification(user?: User | null): Promise<AuthResponse<boolean>> {
  try {
    const targetUser = user || auth.currentUser;
    if (!targetUser) {
      return { success: false, error: 'No active user session to send verification email to.' };
    }

    await sendEmailVerification(targetUser);
    return { success: true, data: true };
  } catch (error: any) {
    return {
      success: false,
      error: mapAuthErrorToMessage(error),
      code: error?.code,
    };
  }
}

/**
 * Reload user state to check if email was verified
 */
export async function checkEmailVerified(user?: User | null): Promise<boolean> {
  try {
    const targetUser = user || auth.currentUser;
    if (!targetUser) return false;

    await reload(targetUser);
    return Boolean(auth.currentUser?.emailVerified);
  } catch (error) {
    console.warn('Error reloading user email verification status:', error);
    return Boolean(auth.currentUser?.emailVerified);
  }
}

/**
 * Send password reset email link
 */
export async function sendPasswordReset(email: string): Promise<AuthResponse<boolean>> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Email address is required to reset password.' };
    }

    await sendPasswordResetEmail(auth, cleanEmail);
    return { success: true, data: true };
  } catch (error: any) {
    return {
      success: false,
      error: mapAuthErrorToMessage(error),
      code: error?.code,
    };
  }
}

/**
 * Verify a password reset action code (oobCode from email link)
 */
export async function verifyResetCode(oobCode: string): Promise<AuthResponse<string>> {
  try {
    const email = await verifyPasswordResetCode(auth, oobCode);
    return { success: true, data: email };
  } catch (error: any) {
    return {
      success: false,
      error: mapAuthErrorToMessage(error),
      code: error?.code,
    };
  }
}

/**
 * Confirm new password with action code
 */
export async function resetPasswordWithCode(
  oobCode: string,
  newPass: string
): Promise<AuthResponse<boolean>> {
  try {
    if (!newPass || newPass.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters.' };
    }

    await confirmPasswordReset(auth, oobCode, newPass);
    return { success: true, data: true };
  } catch (error: any) {
    return {
      success: false,
      error: mapAuthErrorToMessage(error),
      code: error?.code,
    };
  }
}

/**
 * Apply email verification action code (when user opens link directly in app)
 */
export async function applyEmailVerificationCode(oobCode: string): Promise<AuthResponse<boolean>> {
  try {
    await applyActionCode(auth, oobCode);
    if (auth.currentUser) {
      await reload(auth.currentUser);
    }
    return { success: true, data: true };
  } catch (error: any) {
    return {
      success: false,
      error: mapAuthErrorToMessage(error),
      code: error?.code,
    };
  }
}

/**
 * Verify password for Screen Lock Unlock (reauthentication)
 */
export async function verifyUserPasswordForUnlock(password: string): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) {
    // If not logged into Firebase Auth, allow proceed
    return true;
  }

  try {
    const credential = EmailAuthProvider.credential(currentUser.email, password);
    await reauthenticateWithCredential(currentUser, credential);
    return true;
  } catch (error) {
    console.warn('Unlock reauthentication failed:', error);
    return false;
  }
}

/**
 * Sign out user
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
  }
}

/**
 * Subscribe to Firebase Auth state changes
 */
export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export interface SendOtpResponse {
  success: boolean;
  message?: string;
  error?: string;
  devOtp?: string;
  emailDispatched?: boolean;
  retryAfter?: number;
}

export interface VerifyOtpResponse {
  success: boolean;
  verified?: boolean;
  token?: string;
  error?: string;
  attemptsRemaining?: number;
}

/**
 * Request genuine 6-digit OTP to be sent to user's email via backend API
 */
export async function sendEmailOtp(email: string, name?: string): Promise<SendOtpResponse> {
  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'Failed to send verification code. Please try again.',
        retryAfter: data.retryAfter,
      };
    }

    return {
      success: true,
      message: data.message || 'Verification code sent.',
      devOtp: data.devOtp,
      emailDispatched: data.emailDispatched,
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'Network connection issue while requesting OTP. Please check your internet.',
    };
  }
}

/**
 * Verify 6-digit OTP with backend server
 */
export async function verifyEmailOtp(email: string, otp: string): Promise<VerifyOtpResponse> {
  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'Invalid verification code. Please try again.',
        attemptsRemaining: data.attemptsRemaining,
      };
    }

    return {
      success: true,
      verified: true,
      token: data.token,
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'Network error verifying code. Please try again.',
    };
  }
}
