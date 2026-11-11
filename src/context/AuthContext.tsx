import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, TeamMember } from '../types/team.ts';
import { setAuthToken, getAuthToken, API_BASE } from '../services/api.ts';

const AUTH_STORAGE_KEY = 'chronos_team_auth_user';
const USERS_STORAGE_KEY = 'chronos_team_registered_users';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string, title?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (credential: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  findUserByEmail: (email: string) => User | null;
  getProjectMembers: (memberIds: string[]) => TeamMember[];
}

const AuthContext = createContext<AuthContextType | null>(null);

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    const token = getAuthToken();
    if (token) {
      void fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch((error) => {
        console.warn('[AuthContext] Server-side logout could not be confirmed:', error);
      });
    }
    setCurrentUser(null);
    setAuthToken(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {}
  }, []);

  // Validate server-side session on mount
  useEffect(() => {
    let isCancelled = false;

    async function validateCurrentSession() {
      setIsLoading(true);
      const token = getAuthToken();

      if (!token) {
        if (!isCancelled) {
          setCurrentUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.success && data.user) {
            setCurrentUser(data.user);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
          } else if (!isCancelled) {
            logout();
          }
        } else {
          // Token is invalid, expired, or user deleted -> purge session
          if (!isCancelled) {
            logout();
          }
        }
      } catch (netErr) {
        console.warn('[AuthContext] Backend session verification unreachable:', netErr);
        // Offline resilience only with valid stored credentials
        const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!isCancelled) {
          if (savedUser) {
            try {
              setCurrentUser(JSON.parse(savedUser));
            } catch {
              logout();
            }
          } else {
            logout();
          }
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    validateCurrentSession();

    return () => {
      isCancelled = true;
    };
  }, [logout]);

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      const cleanEmail = email.trim().toLowerCase();

      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user && data.token) {
            setAuthToken(data.token);
            setCurrentUser(data.user);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
            setIsLoading(false);
            return { success: true };
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          setIsLoading(false);
          return { success: false, error: errData.error || 'Invalid email or password.' };
        }
      } catch (networkErr: any) {
        setIsLoading(false);
        return { success: false, error: networkErr.message || 'Unable to connect to authentication service.' };
      }

      setIsLoading(false);
      return { success: false, error: 'Authentication failed.' };
    },
    []
  );

  const signup = useCallback(
    async (name: string, email: string, password: string, title?: string): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      const cleanEmail = email.trim().toLowerCase();

      try {
        const res = await fetch(`${API_BASE}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), email: cleanEmail, password, title })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user && data.token) {
            setAuthToken(data.token);
            setCurrentUser(data.user);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
            setIsLoading(false);
            return { success: true };
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          setIsLoading(false);
          return { success: false, error: errData.error || 'Registration failed.' };
        }
      } catch (networkErr: any) {
        setIsLoading(false);
        return { success: false, error: networkErr.message || 'Unable to connect to registration service.' };
      }

      setIsLoading(false);
      return { success: false, error: 'Registration failed.' };
    },
    []
  );

  const loginWithGoogle = useCallback(
    async (credential: string): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential })
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success && data.user && data.token) {
          setAuthToken(data.token);
          setCurrentUser(data.user);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
          setIsLoading(false);
          return { success: true };
        } else {
          setIsLoading(false);
          return { success: false, error: data.error || 'Google authentication failed.' };
        }
      } catch (err: any) {
        setIsLoading(false);
        return { success: false, error: err.message || 'Unable to connect to Google authentication service.' };
      }
    },
    []
  );

  const findUserByEmail = useCallback(
    (email: string): User | null => {
      const clean = email.trim().toLowerCase();
      try {
        const stored = localStorage.getItem(USERS_STORAGE_KEY);
        if (stored) {
          const users = JSON.parse(stored);
          const match = Array.isArray(users) ? users.find((u: any) => u.email?.toLowerCase() === clean) : null;
          if (match) {
            const { password: _, passwordHash: __, ...safe } = match;
            return safe;
          }
        }
      } catch {}
      return null;
    },
    []
  );

  const getProjectMembers = useCallback(
    (memberIds: string[]): TeamMember[] => {
      if (!memberIds || memberIds.length === 0) return [];
      const idSet = new Set(memberIds);
      const list: TeamMember[] = [];

      if (currentUser && idSet.has(currentUser.id)) {
        list.push({
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
          title: currentUser.title,
          avatarColor: currentUser.avatarColor,
          initials: currentUser.initials,
          isOnline: true
        });
      }

      return list;
    },
    [currentUser]
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        signup,
        loginWithGoogle,
        logout,
        findUserByEmail,
        getProjectMembers
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
