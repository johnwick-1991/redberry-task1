import { create } from 'zustand';

const KEY = 'kino.booking';

interface StoredBooking {
  sessionId: number;
  holdId: string | null;
}

function read(): StoredBooking | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredBooking) : null;
  } catch {
    return null;
  }
}

function write(value: StoredBooking | null) {
  try {
    if (value) sessionStorage.setItem(KEY, JSON.stringify(value));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

interface BookingState {
  /** Session whose booking modal is open, or null. */
  sessionId: number | null;
  /** Live hold for that session, kept so a page refresh mid-checkout can resume. */
  holdId: string | null;
  open: (sessionId: number) => void;
  setHold: (holdId: string | null) => void;
  close: () => void;
}

const initial = read();

export const useBookingStore = create<BookingState>((set, get) => ({
  sessionId: initial?.sessionId ?? null,
  holdId: initial?.holdId ?? null,
  open: (sessionId) => {
    const keepHold = get().sessionId === sessionId ? get().holdId : null;
    write({ sessionId, holdId: keepHold });
    set({ sessionId, holdId: keepHold });
  },
  setHold: (holdId) => {
    const { sessionId } = get();
    if (sessionId !== null) write({ sessionId, holdId });
    set({ holdId });
  },
  close: () => {
    write(null);
    set({ sessionId: null, holdId: null });
  },
}));
