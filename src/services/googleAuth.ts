import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App safely (singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Calendar and Tasks scopes
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('https://www.googleapis.com/auth/tasks');

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;
let currentUser: User | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    currentUser = user;
    if (user) {
      try {
        // Automatically check & refresh Firebase ID token if expired
        const idToken = await user.getIdToken(/* forceRefresh */ false);
        if (cachedAccessToken && Date.now() < tokenExpiresAt) {
          if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        } else {
          // Use current ID token if Google OAuth credential token expired
          if (onAuthSuccess) onAuthSuccess(user, idToken);
        }
      } catch (err) {
        console.warn('[GoogleAuth] Token validation failed:', err);
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      tokenExpiresAt = 0;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain OAuth access token from Google Auth Provider.');
    }

    cachedAccessToken = credential.accessToken;
    // Default Google OAuth token expiry: ~3600 seconds
    tokenExpiresAt = Date.now() + 3500 * 1000;
    currentUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Firebase Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Returns a valid access token or refreshes user token automatically
 */
export const getAccessToken = async (): Promise<string | null> => {
  if (currentUser) {
    if (cachedAccessToken && Date.now() < tokenExpiresAt) {
      return cachedAccessToken;
    }
    try {
      return await currentUser.getIdToken(true);
    } catch (e) {
      console.warn('[GoogleAuth] Failed to refresh token:', e);
      return null;
    }
  }
  return null;
};

export const getCurrentUser = (): User | null => {
  return currentUser;
};

export const googleSignOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } finally {
    cachedAccessToken = null;
    tokenExpiresAt = 0;
    currentUser = null;
  }
};
