import { create } from 'zustand';

interface AuthState {
  token: string | null;
  user: {
    username: string;
    email: string;
    fullName?: string;
    role?: 'USER' | 'ADMIN';
  } | null;
  setAuth: (token: string, user: { username: string; email: string; fullName?: string; role?: 'USER' | 'ADMIN' }) => void;
  logout: () => void;
  isAdmin: () => boolean;
}

// Helper functions for localStorage
const getUserFromStorage = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

const saveUserToStorage = (user: AuthState['user']) => {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  user: getUserFromStorage(),
  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    saveUserToStorage(user);
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },
  isAdmin: () => {
    const user = get().user;
    return user?.role === 'ADMIN';
  },
}));
