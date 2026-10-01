import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useAuthModal } from '@/store/authModal';
import { initials } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Spinner';
import { UserIcon } from '@/components/ui/icons';
import { ProfileForm } from './ProfileForm';
import { MyTickets } from './MyTickets';

export function ProfilePage() {
  const { ready, user } = useAuthStore();
  const openLogin = useAuthModal((s) => s.openLogin);
  const navigate = useNavigate();
  const location = useLocation();

  // Guests: ask them to log in right away; staying on the page once they do.
  useEffect(() => {
    if (ready && !user) {
      openLogin({ pending: { onSuccess: () => {}, onCancel: () => navigate('/') } });
    }
  }, [ready, user, openLogin, navigate]);

  // /profile#tickets scrolls to the tickets section.
  useEffect(() => {
    if (user && location.hash === '#tickets') {
      requestAnimationFrame(() => document.getElementById('tickets')?.scrollIntoView({ behavior: 'smooth' }));
    }
  }, [user, location.hash]);

  if (!ready) {
    return (
      <div className="mx-auto max-w-[1600px] px-10 py-10">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="mt-6 h-96 rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-[1600px] px-10 py-24">
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
    <div className="mx-auto max-w-[1600px] px-10 py-10">
      <div className="mb-8 flex items-center gap-5">
        {user.avatar ? (
          <img src={user.avatar} alt="" className="size-20 rounded-full border border-line object-cover" />
        ) : (
          <span className="grid size-20 place-items-center rounded-full bg-surface-3 text-2xl font-bold">
            {initials(user.fullName, user.username)}
          </span>
        )}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{user.fullName || user.username}</h1>
          <p className="text-muted">
            @{user.username} · {user.email}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[560px_1fr] items-start gap-8">
        <ProfileForm user={user} />
        <MyTickets />
      </div>
    </div>
  );
}
