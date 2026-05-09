import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useClerk, useUser } from '@clerk/expo';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

interface User {
  id: string;
  email: string;
  name?: string;
  role: 'customer' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { signOut } = useClerk();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexLoading } =
    useConvexAuth();

  const storeUser = useMutation(api.users.storeUser);
  const convexUser = useQuery(
    api.users.currentUser,
    isConvexAuthenticated ? {} : 'skip',
  );

  const primaryEmail =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses?.[0]?.emailAddress;
  const displayName =
    clerkUser?.fullName ??
    ([clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') ||
      undefined);

  useEffect(() => {
    if (isClerkLoaded && clerkUser && isConvexAuthenticated) {
      storeUser({
        email: primaryEmail,
        name: displayName,
      }).catch(console.error);
    }
  }, [
    clerkUser,
    displayName,
    isClerkLoaded,
    isConvexAuthenticated,
    primaryEmail,
    storeUser,
  ]);

  const user: User | null = convexUser
    ? {
        id: convexUser._id,
        email: convexUser.email,
        name: convexUser.name,
        role: convexUser.role,
      }
    : null;

  const isLoading =
    isConvexLoading || (isConvexAuthenticated && convexUser === undefined);

  const logout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: isConvexAuthenticated && !!user,
        isAdmin: user?.role === 'admin',
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
