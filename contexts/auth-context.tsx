import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, userData?: any) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip actual auth for now - simulate immediate login after short delay
    setTimeout(() => {
      // Create a mock session and user
      const mockUser = {
        id: 'mock-user-123',
        email: 'demo@sihatai.com',
        user_metadata: {
          name: 'Demo User'
        },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        role: 'authenticated',
      } as any; // Use any to avoid type issues for mock

      const mockSession = {
        user: mockUser,
        access_token: 'mock-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh'
      } as any;

      setSession(mockSession);
      setUser(mockUser);
      setLoading(false);
      console.log('Mock auth: User automatically logged in');
    }, 1000); // Small delay to show loading state
  }, []);

  // Mock functions that simulate success
  const signUp = async (email: string, password: string, userData?: any) => {
    setLoading(true);
    console.log('Mock signup for:', email);
    // Simulate API call delay
    setTimeout(() => {
      setLoading(false);
      // User is already "logged in" from useEffect
    }, 1000);
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    console.log('Mock sign in for:', email);
    // Simulate API call delay  
    setTimeout(() => {
      setLoading(false);
      // User is already "logged in" from useEffect
    }, 1000);
  };

  const signOut = async () => {
    setLoading(true);
    console.log('Mock sign out');
    setTimeout(() => {
      setSession(null);
      setUser(null);
      setLoading(false);
      // Immediately log back in for demo
      setTimeout(() => {
        const mockUser = {
          id: 'mock-user-123',
          email: 'demo@sihatai.com',
          user_metadata: { name: 'Demo User' },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          role: 'authenticated',
        } as any;

        const mockSession = {
          user: mockUser,
          access_token: 'mock-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh'
        } as any;

        setSession(mockSession);
        setUser(mockUser);
      }, 500);
    }, 500);
  };

  const updateProfile = async (updates: any) => {
    console.log('Mock profile update:', updates);
    // Do nothing for now
  };

  const value = {
    session,
    user,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}