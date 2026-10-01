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
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="mt-20 border-t border-line">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-10 py-8 text-sm text-muted">
          <Logo />
          <p>© {new Date().getFullYear()} Kino XII · Tbilisi · Batumi</p>
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
