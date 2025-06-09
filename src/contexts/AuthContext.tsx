
"use client";

import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

type Theme = 'light' | 'dark';

interface UserCredentials {
  email: string;
  password?: string;
  username?: string; // For display name during signup
}

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  error: AuthError | null;
  signIn: (credentials: Pick<UserCredentials, 'email' | 'password'>) => Promise<FirebaseUser | null>;
  signUp: (credentials: Required<UserCredentials>) => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
  username: string | null;
  theme: Theme;
  toggleTheme: () => void;
  setAppTheme: (theme: Theme) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [theme, setTheme] = useState<Theme>('light');
  const router = useRouter();

  useEffect(() => {
    const storedTheme = localStorage.getItem('app-theme') as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
      if (storedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // Default to light if no theme is stored or if system preference is dark
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        setTheme('dark');
        document.documentElement.classList.add('dark');
      } else {
        setTheme('light');
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const setAppTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setAppTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setAppTheme]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser?.displayName) {
        setUsername(firebaseUser.displayName);
      } else if (firebaseUser?.email) {
        setUsername(firebaseUser.email.split('@')[0]);
      }
      else {
        setUsername(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (credentials: Pick<UserCredentials, 'email' | 'password'>) => {
    setLoading(true);
    setError(null);
    try {
      if (!credentials.password) throw new Error("Password is required for sign in.");
      const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      setLoading(false);
      return userCredential.user;
    } catch (e) {
      const authError = e as AuthError;
      setError(authError);
      setLoading(false);
      throw authError; 
    }
  };

  const signUp = async (credentials: Required<UserCredentials>) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
      await updateProfile(userCredential.user, { displayName: credentials.username });
      setLoading(false);
      return userCredential.user;
    } catch (e) {
      const authError = e as AuthError;
      setError(authError);
      setLoading(false);
      throw authError; 
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUsername(null);
      router.push('/login'); 
    } catch (e) {
      setError(e as AuthError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, username, loading, error, signIn, signUp, signOut, theme, toggleTheme, setAppTheme }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
