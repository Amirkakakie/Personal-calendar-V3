import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, TeamMember } from '../types/team.ts';

export const INITIAL_DEMO_USERS: (User & { password: string })[] = [
  {
    id: 'user-amir',
    name: 'Amir Rezaei',
    email: 'amir@acme.dev',
    password: 'password123',
    role: 'Admin',
    title: 'Lead Software Architect',
    avatarColor: 'from-violet-600 to-indigo-600',
    initials: 'AR',
    joinedAt: '2024-01-15'
  },
  {
    id: 'user-sarah',
    name: 'Sarah Jenkins',
    email: 'sarah@acme.dev',
    password: 'password123',
    role: 'Member',
    title: 'Senior Product Designer',
    avatarColor: 'from-emerald-600 to-teal-600',
    initials: 'SJ',
    joinedAt: '2024-02-01'
  },
  {
    id: 'user-alex',
    name: 'Alex Chen',
    email: 'alex@acme.dev',
    password: 'password123',
    role: 'Owner',
    title: 'VP of Engineering',
    avatarColor: 'from-sky-600 to-blue-700',
    initials: 'AC',
    joinedAt: '2023-11-10'
  },
  {
    id: 'user-elena',
    name: 'Elena Rostova',
    email: 'elena@acme.dev',
    password: 'password123',
    role: 'Member',
    title: 'QA & Site Reliability Engineer',
    avatarColor: 'from-amber-600 to-orange-600',
    initials: 'ER',
    joinedAt: '2024-03-20'
  }
];

const AUTH_STORAGE_KEY = 'chronos_team_auth_user';
const USERS_STORAGE_KEY = 'chronos_team_registered_users';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string, title?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchDemoUser: (userId: string) => void;
  demoUsers: (User & { password: string })[];
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

  // Load all registered users or initialize with demo users
  const getRegisteredUsers = useCallback((): (User & { password: string })[] => {
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_USERS));
    return INITIAL_DEMO_USERS;
  }, []);

  // Restore authenticated session on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedUser) {
        const user = JSON.parse(savedUser);
        if (user && user.id) {
          setCurrentUser(user);
          setIsLoading(false);
          return;
        }
      }
      // If no session exists, default to logged in as Amir for seamless preview experience
      const defaultUser = INITIAL_DEMO_USERS[0];
      const { password, ...safeUser } = defaultUser;
      setCurrentUser(safeUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(safeUser));
    } catch {
      const defaultUser = INITIAL_DEMO_USERS[0];
      const { password, ...safeUser } = defaultUser;
      setCurrentUser(safeUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      await new Promise(r => setTimeout(r, 350)); // smooth micro-interaction

      const users = getRegisteredUsers();
      const cleanEmail = email.trim().toLowerCase();
      const found = users.find(u => u.email.toLowerCase() === cleanEmail);

      if (!found) {
        setIsLoading(false);
        return { success: false, error: 'User with this email not found.' };
      }

      if (found.password !== password) {
        setIsLoading(false);
        return { success: false, error: 'Incorrect password. Try "password123".' };
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
      await new Promise(r => setTimeout(r, 400));

      const cleanEmail = email.trim().toLowerCase();
      const users = getRegisteredUsers();

      if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
        setIsLoading(false);
        return { success: false, error: 'An account with this email already exists.' };
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
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  const switchDemoUser = useCallback(
    (userId: string) => {
      const users = getRegisteredUsers();
      const found = users.find(u => u.id === userId);
      if (found) {
        const { password: _, ...safeUser } = found;
        setCurrentUser(safeUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(safeUser));
      }
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
        switchDemoUser,
        demoUsers: INITIAL_DEMO_USERS
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
