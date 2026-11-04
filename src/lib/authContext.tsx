import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  USERS_COLLECTION
} from './firebase';
import { TemperatureUnit, AppLanguage } from '../types';

export interface NimbusUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

export type User = NimbusUser;

export interface UserPreferences {
  temperatureUnit?: TemperatureUnit;
  theme?: 'system' | 'light' | 'dark';
  language?: AppLanguage;
  widgetPermission?: 'granted' | 'denied' | 'prompt';
  widgetEnabled?: boolean;
  dailyBriefingTime?: string;
  hydrationDailyGoalMl?: number;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  userPreferences: UserPreferences | null;
  loading: boolean;
  signUpWithEmail: (email: string, pass?: string, name?: string) => Promise<void>;
  signInWithEmail: (email: string, pass?: string) => Promise<void>;
  signInDirectWithEmail: (email: string, displayName?: string) => Promise<{ isNewUser: boolean; user: NimbusUser }>;
  signOut: () => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
}

const LOCAL_STORAGE_KEY = 'nimbus_direct_user_session';

export function generateUserUid(email: string): string {
  const safe = email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
  return `usr_${safe}`.slice(0, 60);
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore user session from localStorage on startup and sync with Firestore
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as NimbusUser;
          if (parsed && parsed.email && parsed.uid) {
            setUser(parsed);
            await fetchUserProfile(parsed);
          }
        }
      } catch (err) {
        console.warn('Could not restore saved session:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Fetch or initialize Firestore user profile
  const fetchUserProfile = async (currentUser: NimbusUser): Promise<UserPreferences | null> => {
    try {
      const userRef = doc(db, USERS_COLLECTION, currentUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as UserPreferences;
        setUserPreferences(data);
        return data;
      } else {
        // Create initial default profile in Firestore
        const initialPrefs: UserPreferences = {
          temperatureUnit: 'celsius',
          theme: 'system',
          language: 'en',
          widgetPermission: 'prompt',
          widgetEnabled: false,
          hydrationDailyGoalMl: 2000,
          lastLoginAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(userRef, {
          email: currentUser.email,
          displayName: currentUser.displayName || currentUser.email.split('@')[0],
          ...initialPrefs
        });
        setUserPreferences(initialPrefs);
        return initialPrefs;
      }
    } catch (err) {
      console.warn('Could not retrieve Firestore user document:', err);
      return null;
    }
  };

  // Direct email sign-up / sign-in (Passwordless)
  const signInDirectWithEmail = async (
    email: string,
    displayName?: string
  ): Promise<{ isNewUser: boolean; user: NimbusUser }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error('Please enter a valid email address.');
    }

    const uid = generateUserUid(cleanEmail);
    const resolvedName = displayName?.trim() || cleanEmail.split('@')[0];

    let isNewUser = false;
    let prefs: UserPreferences;

    try {
      const userRef = doc(db, USERS_COLLECTION, uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        // Existing user: load preferences and update last login
        const existingData = snap.data() as (UserPreferences & { displayName?: string });
        prefs = existingData;
        const finalDisplayName = existingData.displayName || resolvedName;

        const updatedUser: NimbusUser = {
          uid,
          email: cleanEmail,
          displayName: finalDisplayName
        };

        setUser(updatedUser);
        setUserPreferences(prefs);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedUser));

        // Update login timestamp
        updateDoc(userRef, {
          lastLoginAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...(displayName?.trim() ? { displayName: displayName.trim() } : {})
        }).catch(() => {});

        return { isNewUser: false, user: updatedUser };
      } else {
        // New user sign up
        isNewUser = true;
        prefs = {
          temperatureUnit: 'celsius',
          theme: 'system',
          language: 'en',
          widgetPermission: 'prompt',
          widgetEnabled: false,
          hydrationDailyGoalMl: 2000,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };

        const newUser: NimbusUser = {
          uid,
          email: cleanEmail,
          displayName: resolvedName
        };

        await setDoc(userRef, {
          email: cleanEmail,
          displayName: resolvedName,
          ...prefs
        });

        setUser(newUser);
        setUserPreferences(prefs);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newUser));

        return { isNewUser: true, user: newUser };
      }
    } catch (err: any) {
      console.warn('Firestore direct auth sync issue, falling back to local session:', err);
      // Even if Firestore network is temporarily disconnected, ensure immediate user login
      const fallbackUser: NimbusUser = {
        uid,
        email: cleanEmail,
        displayName: resolvedName
      };
      const fallbackPrefs: UserPreferences = {
        temperatureUnit: 'celsius',
        theme: 'system',
        language: 'en',
        widgetPermission: 'prompt',
        widgetEnabled: false,
        hydrationDailyGoalMl: 2000
      };
      setUser(fallbackUser);
      setUserPreferences(fallbackPrefs);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fallbackUser));
      return { isNewUser: false, user: fallbackUser };
    }
  };

  // Sign up wrapper (compatible with existing signature)
  const signUpWithEmail = async (email: string, _pass?: string, name?: string) => {
    await signInDirectWithEmail(email, name);
  };

  // Sign in wrapper (compatible with existing signature)
  const signInWithEmail = async (email: string, _pass?: string) => {
    await signInDirectWithEmail(email);
  };

  // Sign out cleanly
  const signOut = async () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setUser(null);
    setUserPreferences(null);
  };

  // Update user preferences in local state & Firestore
  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    setUserPreferences((prev) => ({ ...(prev || {}), ...updates }));
    if (!user) return;
    try {
      const userRef = doc(db, USERS_COLLECTION, user.uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Could not update Firestore user document:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userPreferences,
        loading,
        signUpWithEmail,
        signInWithEmail,
        signInDirectWithEmail,
        signOut,
        updatePreferences
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

