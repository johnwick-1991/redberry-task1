import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AgeRating, User } from '@/api/types';
import { useAuthStore } from '@/store/auth';
import { useAuthModal } from '@/store/authModal';
import { useBookingStore } from '@/store/booking';
import { toast } from '@/store/toast';

export const PROFILE_INCOMPLETE_MESSAGE = 'Please complete your profile to enable booking.';

/** Age gate: only 16+ and 18+ titles are checked against the account (per the brief). */
export function isAgeRestricted(user: User | null, rating: AgeRating): boolean {
  if (!user || user.age === null || user.age === undefined) return false;
  return rating.minAge >= 16 && user.age < rating.minAge;
}

export function ageRestrictionMessage(rating: AgeRating): string {
  return `This film is rated ${rating.code}. You cannot buy tickets for it with this account.`;
}

/**
 * Wraps a protected action. Logged in: run it now. Guest: open the login
 * modal and run it automatically right after a successful login or sign up.
 */
export function useRequireAuth() {
  const openLogin = useAuthModal((s) => s.openLogin);
  return useCallback(
    (action: () => void) => {
      const { token, user } = useAuthStore.getState();
      if (token && user) action();
      else openLogin({ pending: { onSuccess: action } });
    },
    [openLogin],
  );
}

/**
 * Click on a session: login -> complete profile -> age gate -> booking modal.
 * Each check reads the store at run time, so it is correct when replayed after login.
 */
export function useStartBooking() {
  const requireAuth = useRequireAuth();
  const navigate = useNavigate();
  const openBooking = useBookingStore((s) => s.open);

  return useCallback(
    (sessionId: number, rating: AgeRating) => {
      requireAuth(() => {
        const user = useAuthStore.getState().user;
        if (!user) return;
        if (!user.profileComplete) {
          toast(PROFILE_INCOMPLETE_MESSAGE, 'warning');
          navigate('/profile');
          return;
        }
        if (isAgeRestricted(user, rating)) {
          toast(ageRestrictionMessage(rating), 'error');
          return;
        }
        openBooking(sessionId);
      });
    },
    [requireAuth, navigate, openBooking],
  );
}
