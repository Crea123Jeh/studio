"use client";

import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface UserCredentials {
  username: string;
  password?: string; // Password is not always needed, e.g. for just checking state
}

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  error: AuthError | null;
  signIn: (credentials: UserCredentials) => Promise<FirebaseUser | null>;
  signUp: (credentials: UserCredentials) => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
  username: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// This is a simplified domain for internal email construction.
// In a real app, ensure this domain is unique and controlled by you.
const APP_DOMAIN = "ppm-dashboard.local";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser?.displayName) {
        setUsername(firebaseUser.displayName);
      } else if (firebaseUser?.email?.includes(`@${APP_DOMAIN}`)) {
        setUsername(firebaseUser.email.split(`@${APP_DOMAIN}`)[0]);
      } else {
        setUsername(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const formatEmail = (username: string) => `${username}@${APP_DOMAIN}`;

  const signIn = async (credentials: UserCredentials) => {
    setLoading(true);
    setError(null);
    try {
      if (!credentials.password) throw new Error("Password is required for sign in.");
      const userCredential = await signInWithEmailAndPassword(auth, formatEmail(credentials.username), credentials.password);
      setUser(userCredential.user);
      setUsername(credentials.username); // Or derive from userCredential.user.displayName
      setLoading(false);
      return userCredential.user;
    } catch (e) {
      setError(e as AuthError);
      setLoading(false);
      return null;
    }
  };

  const signUp = async (credentials: UserCredentials) => {
    setLoading(true);
    setError(null);
    try {
      if (!credentials.password) throw new Error("Password is required for sign up.");
      const userCredential = await createUserWithEmailAndPassword(auth, formatEmail(credentials.username), credentials.password);
      await updateProfile(userCredential.user, { displayName: credentials.username });
      setUser(userCredential.user);
      setUsername(credentials.username);
      setLoading(false);
      return userCredential.user;
    } catch (e) {
      setError(e as AuthError);
      setLoading(false);
      return null;
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUsername(null);
      router.push('/login'); // Redirect to login after sign out
    } catch (e) {
      setError(e as AuthError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, username, loading, error, signIn, signUp, signOut }}>
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
