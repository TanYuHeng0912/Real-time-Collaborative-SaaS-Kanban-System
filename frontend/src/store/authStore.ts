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

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  user: null,
  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null });
  },
  isAdmin: () => {
    const user = get().user;
    return user?.role === 'ADMIN';
  },
}));
