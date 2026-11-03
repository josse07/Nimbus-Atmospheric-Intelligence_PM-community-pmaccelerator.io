import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  type User,
  USERS_COLLECTION
} from './firebase';
import { TemperatureUnit, AppLanguage } from '../types';

export interface UserPreferences {
  temperatureUnit?: TemperatureUnit;
  theme?: 'system' | 'light' | 'dark';
  language?: AppLanguage;
  widgetPermission?: 'granted' | 'denied' | 'prompt';
  widgetEnabled?: boolean;
  dailyBriefingTime?: string;
  hydrationDailyGoalMl?: number;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: User | null;
  userPreferences: UserPreferences | null;
  loading: boolean;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync with Firestore profile
  const fetchUserProfile = async (currentUser: User) => {
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
          lastLoginAt: new Date().toISOString()
        };
        await setDoc(userRef, {
          email: currentUser.email,
          displayName: currentUser.displayName || '',
          ...initialPrefs,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        setUserPreferences(initialPrefs);
        return initialPrefs;
      }
    } catch (err) {
      console.warn('Could not retrieve Firestore user document:', err);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchUserProfile(currentUser);
      } else {
        setUserPreferences(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (name?.trim() && cred.user) {
      try {
        await updateProfile(cred.user, { displayName: name.trim() });
      } catch (_) {}
    }
    const initialPrefs: UserPreferences = {
      temperatureUnit: 'celsius',
      theme: 'system',
      language: 'en',
      widgetPermission: 'prompt',
      widgetEnabled: false,
      hydrationDailyGoalMl: 2000,
      lastLoginAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, USERS_COLLECTION, cred.user.uid), {
        email: cred.user.email,
        displayName: name?.trim() || '',
        ...initialPrefs,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setUserPreferences(initialPrefs);
    } catch (err) {
      console.warn('Could not save initial user doc to Firestore:', err);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    if (cred.user) {
      await fetchUserProfile(cred.user);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setUserPreferences(null);
  };

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
