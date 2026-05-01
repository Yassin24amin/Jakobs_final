import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
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
  const { signOut } = useClerkAuth();
  const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexLoading } =
    useConvexAuth();

  const storeUser = useMutation(api.users.storeUser);
  const convexUser = useQuery(
    api.users.currentUser,
    isConvexAuthenticated ? {} : 'skip',
  );

  // Sync Clerk identity → Convex users table whenever Convex auth activates
  useEffect(() => {
    if (isConvexAuthenticated) {
      storeUser().catch(console.error);
    }
  }, [isConvexAuthenticated, storeUser]);

  const user: User | null = convexUser
    ? {
        id: convexUser._id,
        email: convexUser.email,
        name: convexUser.name,
        role: convexUser.role,
      }
    : null;

  // Loading while Convex auth is resolving OR user record hasn't arrived yet
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
