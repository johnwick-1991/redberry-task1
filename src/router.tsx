import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Skeleton } from '@/components/ui/Spinner';

// Pages are split into their own chunks and loaded on first visit.
const HomePage = lazy(() => import('@/features/home/HomePage').then((m) => ({ default: m.HomePage })));
const SessionsPage = lazy(() => import('@/features/sessions/SessionsPage').then((m) => ({ default: m.SessionsPage })));
const MoviePage = lazy(() => import('@/features/movie/MoviePage').then((m) => ({ default: m.MoviePage })));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));

/** While a page's code loads, show its shape (skeletons), never a full-page spinner. */
function ListPageSkeleton() {
  return (
    <div className="px-[51px] pt-[117px]" aria-busy="true">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-3 h-4 w-64" />
      <div className="mt-9 flex gap-[51px]">
        <Skeleton className="h-[640px] w-80 shrink-0 rounded-2xl" />
        <div className="flex flex-1 flex-col gap-8">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex flex-col gap-3.5">
              <Skeleton className="h-20 w-64 rounded-lg" />
              <div className="flex gap-3">
                {Array.from({ length: 4 }, (_, j) => (
                  <Skeleton key={j} className="h-[98px] w-[252px] rounded-2xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroPageSkeleton({ height }: { height: string }) {
  return (
    <div aria-busy="true">
      <Skeleton className={`${height} w-full rounded-none`} />
      <div className="flex gap-4 px-[51px] pt-8">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-40 w-[260px] rounded-[20px]" />
        ))}
      </div>
    </div>
  );
}

function Page({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}
import { EmptyState } from '@/components/ui/States';
import { buttonClasses } from '@/components/ui/Button';

function NotFound() {
  return (
    <div className="px-[51px] pb-10 pt-[140px]">
      <EmptyState
        title="Page not found"
        description="The page you are looking for does not exist or has moved."
        action={
          <Link to="/" className={buttonClasses()}>
            Back to home
          </Link>
        }
      />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Page fallback={<HeroPageSkeleton height="h-[760px]" />}><HomePage /></Page> },
      { path: '/sessions', element: <Page fallback={<ListPageSkeleton />}><SessionsPage /></Page> },
      { path: '/movies/:slug', element: <Page fallback={<HeroPageSkeleton height="h-[567px]" />}><MoviePage /></Page> },
      { path: '/profile', element: <Page fallback={<ListPageSkeleton />}><ProfilePage /></Page> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
