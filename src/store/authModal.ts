import { create } from 'zustand';

type AuthModal = 'login' | 'register' | null;

interface PendingAction {
  onSuccess: () => void;
  onCancel?: () => void;
}

interface AuthModalState {
  modal: AuthModal;
  /** Optional notice shown at the top of the login modal (e.g. session expired). */
  notice: string | null;
  /** Actions to replay once the user has logged in or signed up. */
  pending: PendingAction[];
  openLogin: (opts?: { notice?: string; pending?: PendingAction }) => void;
  openRegister: () => void;
  switchTo: (modal: 'login' | 'register') => void;
  /** Auth succeeded: close and replay everything that was waiting. */
  complete: () => void;
  /** User dismissed the modal without signing in. */
  dismiss: () => void;
}

export const useAuthModal = create<AuthModalState>((set, get) => ({
  modal: null,
  notice: null,
  pending: [],
  openLogin: (opts) =>
    set((s) => ({
      modal: 'login',
      notice: opts?.notice ?? s.notice,
      pending: opts?.pending ? [...s.pending, opts.pending] : s.pending,
    })),
  openRegister: () => set({ modal: 'register', notice: null }),
  switchTo: (modal) => set({ modal, notice: null }),
  complete: () => {
    const { pending } = get();
    set({ modal: null, notice: null, pending: [] });
    // Run after the modal has closed so a follow-up modal (booking) can open cleanly.
    queueMicrotask(() => pending.forEach((p) => p.onSuccess()));
  },
  dismiss: () => {
    const { pending } = get();
    set({ modal: null, notice: null, pending: [] });
    pending.forEach((p) => p.onCancel?.());
  },
}));
