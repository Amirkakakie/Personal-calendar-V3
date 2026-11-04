import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, TeamMember } from '../types/team.ts';
import { setAuthToken, getAuthToken, API_BASE } from '../services/api.ts';

// Clean empty slate: No preloaded mock accounts
const SEED_USERS: (User & { password: string })[] = [];

const AUTH_STORAGE_KEY = 'chronos_team_auth_user';
const USERS_STORAGE_KEY = 'chronos_team_registered_users';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string, title?: string) => Promise<{ success: boolean; error?: string }>;
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

  // Internal helper to access registered users (never exposed to UI directly)
  const getRegisteredUsers = useCallback((): (User & { password: string })[] => {
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return SEED_USERS;
  }, []);

  // Restore authenticated session on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      const token = getAuthToken();
      if (savedUser && token) {
        const user = JSON.parse(savedUser);
        if (user && user.id && user.email) {
          setCurrentUser(user);
        }
      } else if (savedUser && !token) {
        // Fallback for previous sessions
        const user = JSON.parse(savedUser);
        if (user && user.id && user.email) {
          setCurrentUser(user);
        }
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setAuthToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      const cleanEmail = email.trim().toLowerCase();

      // First attempt backend authentication for cryptographic JWT token
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
        } else if (res.status === 401 || res.status === 400) {
          const errData = await res.json().catch(() => ({}));
          setIsLoading(false);
          return { success: false, error: errData.error || 'Invalid email or password.' };
        }
      } catch (networkErr) {
        console.warn('[AuthContext] Backend login request failed, falling back to local credentials:', networkErr);
      }

      // Local fallback for offline mode
      const users = getRegisteredUsers();
      const found = users.find(u => u.email.toLowerCase() === cleanEmail);

      if (!found) {
        setIsLoading(false);
        return { success: false, error: 'No account found with this email address.' };
      }

      if (found.password !== password) {
        setIsLoading(false);
        return { success: false, error: 'Incorrect password.' };
      }

      const { password: _, ...safeUser } = found;
      setCurrentUser(safeUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(safeUser));
      setIsLoading(false);
      return { success: true };
    },
    [getRegisteredUsers]
  );

  const signup = useCallback(
    async (name: string, email: string, password: string, title?: string): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      const cleanEmail = email.trim().toLowerCase();

      // First attempt backend registration for cryptographic JWT token
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
            
            // Sync with local registered users store
            const users = getRegisteredUsers();
            const localUser = { ...data.user, password };
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([...users.filter(u => u.id !== localUser.id), localUser]));

            setIsLoading(false);
            return { success: true };
          }
        } else if (res.status === 400) {
          const errData = await res.json().catch(() => ({}));
          setIsLoading(false);
          return { success: false, error: errData.error || 'Registration failed.' };
        }
      } catch (networkErr) {
        console.warn('[AuthContext] Backend signup request failed, falling back to local store:', networkErr);
      }

      // Local fallback for offline mode
      const users = getRegisteredUsers();
      if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
        setIsLoading(false);
        return { success: false, error: 'An account with this email address already exists.' };
      }

      const avatarColors = [
        'from-violet-600 to-indigo-600',
        'from-emerald-600 to-teal-600',
        'from-sky-600 to-blue-700',
        'from-amber-600 to-orange-600',
        'from-rose-600 to-pink-600',
        'from-fuchsia-600 to-purple-600'
      ];
      const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

      const newUser: User & { password: string } = {
        id: `user-${Date.now()}`,
        name: name.trim(),
        email: cleanEmail,
        password,
        role: 'Member',
        title: title?.trim() || 'Software Engineer',
        avatarColor: randomColor,
        initials: getInitials(name),
        joinedAt: new Date().toISOString().split('T')[0]
      };

      const updatedUsers = [...users, newUser];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));

      const { password: _, ...safeUser } = newUser;
      setCurrentUser(safeUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(safeUser));
      setIsLoading(false);
      return { success: true };
    },
    [getRegisteredUsers]
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    setAuthToken(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  // Secure user lookup by exact email (for project invitation verification only)
  const findUserByEmail = useCallback(
    (email: string): User | null => {
      const clean = email.trim().toLowerCase();
      const users = getRegisteredUsers();
      const match = users.find(u => u.email.toLowerCase() === clean);
      if (!match) return null;
      const { password: _, ...safe } = match;
      return safe;
    },
    [getRegisteredUsers]
  );

  // Get member details exclusively for IDs that belong to a specific authorized project
  const getProjectMembers = useCallback(
    (memberIds: string[]): TeamMember[] => {
      if (!memberIds || memberIds.length === 0) return [];
      const idSet = new Set(memberIds);
      const users = getRegisteredUsers();
      return users
        .filter(u => idSet.has(u.id))
        .map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          title: u.title,
          avatarColor: u.avatarColor,
          initials: u.initials,
          isOnline: true
        }));
    },
    [getRegisteredUsers]
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        signup,
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
