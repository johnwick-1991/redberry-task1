import clsx from 'clsx';
import { useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useAuthModal } from '@/store/authModal';
import { useTickets } from '@/api/queries';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Spinner';
import { UserIcon } from '@/components/ui/icons';
import { ProfileForm } from './ProfileForm';
import { MyTickets } from './MyTickets';

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="flex cursor-pointer flex-col gap-3.5"
    >
      <span className={clsx('flex items-center gap-2 px-0.5 text-sm font-semibold', active ? 'text-ink' : 'text-muted hover:text-ink')}>
        {children}
      </span>
      <span className={clsx('h-0.5 w-full rounded-t-sm', active && 'bg-accent')} />
    </button>
  );
}

export function ProfilePage() {
  const { ready, user } = useAuthStore();
  const openLogin = useAuthModal((s) => s.openLogin);
  const navigate = useNavigate();
  const location = useLocation();
  const upcoming = useTickets('upcoming');
  const tab = location.hash === '#tickets' ? 'tickets' : 'info';

  // Guests: ask them to log in right away; staying on the page once they do.
  useEffect(() => {
    if (ready && !user) {
      openLogin({ pending: { onSuccess: () => {}, onCancel: () => navigate('/') } });
    }
  }, [ready, user, openLogin, navigate]);

  if (!ready) {
    return (
      <div className="px-[51px] pt-[117px]">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="mt-6 h-96 w-[880px] rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-[51px] pt-[140px]">
        <EmptyState
          icon={<UserIcon className="size-10" />}
          title="Log in to see your profile"
          description="Your personal details and tickets live here."
          action={<Button onClick={() => openLogin()}>Log in</Button>}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-9 px-[51px] pt-[117px]">
      <div className="flex flex-col gap-7 border-b border-surface">
        <h1 className="text-2xl font-extrabold">My Profile</h1>
        <div role="tablist" className="flex gap-8">
          <Tab active={tab === 'info'} onClick={() => navigate({ hash: '' }, { replace: true })}>
            Personal Information
            {!user.profileComplete && <span className="size-2 rounded-full bg-warn" title="Profile incomplete" />}
          </Tab>
          <Tab active={tab === 'tickets'} onClick={() => navigate({ hash: 'tickets' }, { replace: true })}>
            My Tickets
            {!!upcoming.data?.length && (
              <span className="rounded-full bg-accent px-1.5 py-0.5 text-xs text-white">{upcoming.data.length}</span>
            )}
          </Tab>
        </div>
      </div>

      <div role="tabpanel">{tab === 'info' ? <ProfileForm user={user} /> : <MyTickets />}</div>
    </div>
  );
}
