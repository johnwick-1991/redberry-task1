import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { logout } from '@/api/endpoints';
import { useAuthStore } from '@/store/auth';
import { useAuthModal } from '@/store/authModal';
import { useBookingStore } from '@/store/booking';
import { initials } from '@/lib/format';
import { useRequireAuth } from '@/lib/guards';
import { Button } from '@/components/ui/Button';
import { CheckIcon, ChevronDown, LogoutIcon, TicketIcon, UserIcon } from '@/components/ui/icons';
import { SearchBox } from './SearchBox';

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Kino XII home">
      <span className="grid size-9 place-items-center rounded-lg bg-accent text-white shadow-lg shadow-accent/30">
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      <span className="text-lg font-extrabold tracking-tight">
        KINO <span className="text-accent">XII</span>
      </span>
    </Link>
  );
}

function UserMenu() {
  const user = useAuthStore((s) => s.user)!;
  const clear = useAuthStore((s) => s.clear);
  const closeBooking = useBookingStore((s) => s.close);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      /* the token is dropped locally regardless of the response */
    }
    clear();
    closeBooking();
    queryClient.removeQueries({ queryKey: ['tickets'] });
    queryClient.invalidateQueries();
    setLoggingOut(false);
    setOpen(false);
    if (location.pathname.startsWith('/profile')) navigate('/');
  };

  const complete = user.profileComplete;
  const displayName = user.fullName || user.username;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-surface-3"
      >
        <span className="relative">
          {user.avatar ? (
            <img src={user.avatar} alt="" className="size-9 rounded-full object-cover" />
          ) : (
            <span className="grid size-9 place-items-center rounded-full bg-surface-3 text-sm font-bold">
              {initials(user.fullName, user.username)}
            </span>
          )}
          <span
            title={complete ? 'Profile complete' : 'Profile incomplete'}
            className={clsx(
              'absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-bg',
              complete ? 'bg-ok' : 'bg-warn',
            )}
          />
        </span>
        <span className="max-w-40 truncate text-sm font-semibold">{displayName}</span>
        <ChevronDown className={clsx('size-4 text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-13 z-40 w-72 animate-fade-in overflow-hidden rounded-xl border border-line bg-surface py-1.5 shadow-2xl"
        >
          <div className="flex items-center gap-3 px-4 pb-3 pt-2">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="size-10 rounded-full object-cover" />
            ) : (
              <span className="grid size-10 place-items-center rounded-full bg-surface-3 text-sm font-bold">
                {initials(user.fullName, user.username)}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{displayName}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>
          <Link
            to="/profile"
            className={clsx(
              'mx-3 mb-2 block rounded-lg border px-3 py-2 text-xs',
              complete ? 'border-ok/30 bg-ok/10 text-ok' : 'border-warn/30 bg-warn/10',
            )}
          >
            {complete ? (
              <span className="flex items-center gap-1.5 font-semibold">
                Profile Complete <CheckIcon className="size-3.5" />
              </span>
            ) : (
              <>
                <span className="block font-semibold text-warn">Profile incomplete</span>
                <span className="text-muted">Please complete your profile to enable booking.</span>
              </>
            )}
          </Link>
          <div className="mb-1 border-t border-line" />
          <Link
            role="menuitem"
            to="/profile"
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-surface-3"
          >
            <UserIcon className="size-4 text-muted" /> My Profile
            {!complete && <span className="ml-auto size-2 rounded-full bg-warn" />}
          </Link>
          <Link
            role="menuitem"
            to="/profile#tickets"
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-surface-3"
          >
            <TicketIcon className="size-4 text-muted" /> My Tickets
          </Link>
          <div className="my-1 border-t border-line" />
          <button
            role="menuitem"
            type="button"
            disabled={loggingOut}
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-surface-3 disabled:opacity-50"
          >
            <LogoutIcon className="size-4 text-muted" /> {loggingOut ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const { token, user, ready } = useAuthStore();
  const openLogin = useAuthModal((s) => s.openLogin);
  const openRegister = useAuthModal((s) => s.openRegister);
  const requireAuth = useRequireAuth();
  const navigate = useNavigate();
  const authed = token !== null && user !== null;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
      isActive ? 'text-ink' : 'text-muted hover:text-ink',
    );

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-18 max-w-[1600px] items-center gap-8 px-10">
        <Logo />
        <nav className="flex items-center gap-1">
          <NavLink to="/sessions" className={linkClass}>
            Sessions
          </NavLink>
          <button
            type="button"
            className="cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink"
            onClick={() => requireAuth(() => navigate('/profile#tickets'))}
          >
            My Tickets
          </button>
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <SearchBox />
          {!ready ? (
            <div className="h-10 w-40 animate-pulse rounded-full bg-surface-3" />
          ) : authed ? (
            <UserMenu />
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => openLogin()}>
                Log in
              </Button>
              <Button onClick={openRegister}>Sign up</Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
