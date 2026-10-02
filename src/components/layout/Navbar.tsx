import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { logout } from '@/api/endpoints';
import { useAuthStore } from '@/store/auth';
import { useAuthModal } from '@/store/authModal';
import { useBookingStore } from '@/store/booking';
import { initials } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { ChevronDown, FigmaIcon, LogoutIcon, UserIcon } from '@/components/ui/icons';
import { SearchBox } from './SearchBox';

export function Logo({ className = 'text-xl' }: { className?: string }) {
  return (
    <Link to="/" className={clsx('flex items-center gap-1.5 font-extrabold', className)} aria-label="Kino XII home">
      <span className="text-ink">KINO</span>
      <span className="text-accent">XII</span>
    </Link>
  );
}

function Avatar({ size = 'size-9' }: { size?: string }) {
  const user = useAuthStore((s) => s.user)!;
  return user.avatar ? (
    <img src={user.avatar} alt="" className={clsx(size, 'rounded-lg object-cover')} />
  ) : (
    <span className={clsx(size, 'grid place-items-center rounded-lg bg-surface-3 text-xs font-semibold')}>
      {initials(user.fullName, user.username)}
    </span>
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

  const firstName = displayName.split(' ')[0];
  const itemClass = 'flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold hover:bg-tint-white';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-3"
      >
        <span className="relative">
          <Avatar />
          <span
            title={complete ? 'Profile complete' : 'Profile incomplete'}
            className={clsx(
              'absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-bg',
              complete ? 'bg-ok' : 'bg-warn',
            )}
          />
        </span>
        <span className="max-w-40 truncate text-xs font-semibold">{firstName}</span>
        <ChevronDown className={clsx('size-4 text-ink transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-40 w-[302px] animate-fade-in overflow-hidden rounded-xl border border-surface-3 bg-bg py-2 shadow-2xl"
        >
          <div className="flex items-center gap-3 px-4 pb-3 pt-2">
            <Avatar size="size-10" />
            <div className="min-w-0">
              <p className="truncate text-xs font-extrabold">{displayName}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>
          <Link
            to="/profile"
            className={clsx(
              'mx-4 mb-2 block rounded-lg px-3 py-2.5 text-xs',
              complete ? 'bg-ok/10 text-ok' : 'bg-surface-3',
            )}
          >
            {complete ? (
              <span className="flex items-center gap-1.5 font-semibold">
                Profile Complete <FigmaIcon name="confirm" className="size-3" />
              </span>
            ) : (
              <>
                <span className="block font-semibold text-warn">Profile incomplete</span>
                <span className="text-muted">Please complete your profile to enable booking.</span>
              </>
            )}
          </Link>
          <Link role="menuitem" to="/profile" className={itemClass}>
            <UserIcon className="size-4" /> My Profile
          </Link>
          <Link role="menuitem" to="/profile#tickets" className={itemClass}>
            <FigmaIcon name="ticket" className="size-4" /> My Tickets
          </Link>
          <div className="my-1 border-t border-surface-3" />
          <button
            role="menuitem"
            type="button"
            disabled={loggingOut}
            onClick={handleLogout}
            className={clsx(itemClass, 'text-accent disabled:opacity-50')}
          >
            <LogoutIcon className="size-4" /> {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      )}
    </div>
  );
}

/** Sits over the page (and over the hero on Home and film pages), as in the design. */
export function Navbar() {
  const { token, user, ready } = useAuthStore();
  const openLogin = useAuthModal((s) => s.openLogin);
  const openRegister = useAuthModal((s) => s.openRegister);
  const authed = token !== null && user !== null;

  return (
    <header className="absolute inset-x-0 top-0 z-30 bg-[url(/figma/navbar-bg.png)] bg-cover bg-top">
      <div className="flex items-center justify-between px-[60px] pb-10 pt-[30px]">
        <div className="flex items-center gap-9">
          <Logo />
          <NavLink
            to="/sessions"
            className={({ isActive }) =>
              clsx('text-xs font-semibold uppercase tracking-[0.72px] transition-colors', isActive ? 'text-ink' : 'text-ink/80 hover:text-ink')
            }
          >
            Sessions
          </NavLink>
        </div>

        <div className="flex items-center gap-8">
          <SearchBox />
          {!ready ? (
            <div className="h-10 w-44 animate-pulse rounded-full bg-tint-white" />
          ) : authed ? (
            <UserMenu />
          ) : (
            <div className="flex items-center gap-3">
              <Button onClick={openRegister}>Sign up</Button>
              <Button variant="light" onClick={() => openLogin()}>
                Log in
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
