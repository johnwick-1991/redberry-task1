import { useEffect } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { fetchMe } from '@/api/endpoints';
import { parseApiError } from '@/api/errors';
import { useFilterOptions } from '@/api/queries';
import { useAuthStore } from '@/store/auth';
import { LoginModal } from '@/features/auth/LoginModal';
import { RegisterModal } from '@/features/auth/RegisterModal';
import { BookingModal } from '@/features/booking/BookingModal';
import { Toaster } from '@/components/ui/Toaster';
import { Navbar, Logo } from './Navbar';

/** Restore the session from a stored token. A 401 means the token is stale: drop it, stay a guest. */
function useRestoreSession() {
  useEffect(() => {
    const { token, setUser, clear, markReady } = useAuthStore.getState();
    if (!token) return;
    fetchMe()
      .then((user) => {
        setUser(user);
        markReady();
      })
      .catch((error) => {
        if (parseApiError(error).kind === 'unauthenticated') clear();
        else markReady(); // network/server hiccup: carry on as a guest without dropping the token
      });
  }, []);
}

export function Layout() {
  useRestoreSession();
  // Fetched once at boot; every list in the UI is driven by it.
  useFilterOptions();

  return (
    <div className="relative flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="mt-20 px-[34px] pb-[34px] pt-[27px]">
        <div className="flex items-center justify-between border-t border-surface-3 pt-5">
          <Logo className="text-sm" />
          <p className="text-xs text-muted">© {new Date().getFullYear()} Kino XII. All rights reserved.</p>
        </div>
      </footer>

      <LoginModal />
      <RegisterModal />
      <BookingModal />
      <Toaster />
      <ScrollRestoration getKey={(location) => location.pathname} />
    </div>
  );
}
