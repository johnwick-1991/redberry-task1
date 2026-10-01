import { create } from 'zustand';
import type { User } from '@/api/types';

const TOKEN_KEY = 'kino.token';

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

interface AuthState {
  token: string | null;
  user: User | null;
  /** True once the boot-time /me check has finished (or there was no token). */
  ready: boolean;
  setSession: (token: string, user: User) => void;
  setUser: (user: User) => void;
  clear: () => void;
  markReady: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: readToken(),
  user: null,
  ready: readToken() === null,
  setSession: (token, user) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage blocked: keep the session in memory only */
    }
    set({ token, user, ready: true });
  },
  setUser: (user) => set({ user }),
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    set({ token: null, user: null, ready: true });
  },
  markReady: () => set({ ready: true }),
}));

export const selectIsAuthed = (s: AuthState) => s.token !== null && s.user !== null;
