'use client';

import { createContext, useContext, ReactNode } from 'react';
import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react';
import type { Session } from 'next-auth';

type AccessTier = 'FREE' | 'PREMIUM' | 'PRO';

interface AuthContextType {
  session: Session | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  user: Session['user'] | null;
  signIn: typeof signIn;
  signOut: typeof signOut;
  hasAccess: (requiredTier: AccessTier) => boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Inner provider that uses the session
function AuthContextInner({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const tierHierarchy: Record<AccessTier, number> = {
    FREE: 1,
    PREMIUM: 2,
    PRO: 3,
  };

  const hasAccess = (requiredTier: AccessTier): boolean => {
    if (status !== 'authenticated' || !session?.user?.accessTier) {
      return false;
    }
    return tierHierarchy[session.user.accessTier] >= tierHierarchy[requiredTier];
  };

  const value: AuthContextType = {
    session,
    status,
    user: session?.user ?? null,
    signIn,
    signOut,
    hasAccess,
    isAuthenticated: status === 'authenticated',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Outer provider that sets up SessionProvider
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextInner>{children}</AuthContextInner>
    </SessionProvider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
