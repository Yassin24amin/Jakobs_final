import React, { createContext, useContext, useState, useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

const ADMIN_EMAILS = ['yahia@bals.pro', 'yassin@bals.pro'];

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
  login: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const getOrCreateByEmail = useMutation(api.users.getOrCreateByEmail);

  // Query the user from Convex whenever we have a logged-in email
  const convexUser = useQuery(
    api.users.getByEmail,
    loggedInEmail ? { email: loggedInEmail } : 'skip',
  );

  const user: User | null = convexUser
    ? {
        id: convexUser._id,
        email: convexUser.email,
        name: convexUser.name,
        role: convexUser.role,
      }
    : null;

  const isLoading = isLoggingIn || (loggedInEmail !== null && convexUser === undefined);

  const login = useCallback(
    async (email: string) => {
      setIsLoggingIn(true);
      try {
        await getOrCreateByEmail({ email: email.trim().toLowerCase() });
        setLoggedInEmail(email.trim().toLowerCase());
      } finally {
        setIsLoggingIn(false);
      }
    },
    [getOrCreateByEmail],
  );

  const logout = useCallback(async () => {
    setLoggedInEmail(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        logout,
        login,
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
