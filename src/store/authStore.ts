import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  /** Dispensa do aviso de email — vale só para a sessão atual, não é persistida */
  emailPromptDismissed: boolean;
  setAuth: (user: User, token: string) => void;
  updateUser: (user: User) => void;
  dismissEmailPrompt: () => void;
  logout: () => Promise<void>;
}

// Função auxiliar para carregar usuário do localStorage
const loadUserFromStorage = (): User | null => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>()((set) => ({
  user: loadUserFromStorage(),
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  emailPromptDismissed: false,

  setAuth: (user: User, token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true, emailPromptDismissed: false });
  },

  updateUser: (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  dismissEmailPrompt: () => set({ emailPromptDismissed: true }),
  
  logout: async () => {
    try {
      await import('../services/authService').then(m => m.authService.logout());
    } catch {
      // Ignore network errors — always clear local state
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false, emailPromptDismissed: false });
  },
}));