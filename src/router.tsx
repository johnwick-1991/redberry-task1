import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Spinner } from '@/components/ui/Spinner';

// Pages are split into their own chunks and loaded on first visit.
const HomePage = lazy(() => import('@/features/home/HomePage').then((m) => ({ default: m.HomePage })));
const SessionsPage = lazy(() => import('@/features/sessions/SessionsPage').then((m) => ({ default: m.SessionsPage })));
const MoviePage = lazy(() => import('@/features/movie/MoviePage').then((m) => ({ default: m.MoviePage })));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));

function Page({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[60vh] place-items-center text-muted">
          <Spinner className="size-8" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
import { EmptyState } from '@/components/ui/States';
import { buttonClasses } from '@/components/ui/Button';

function NotFound() {
  return (
    <div className="mx-auto max-w-[1600px] px-10 py-24">
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
      { path: '/', element: <Page><HomePage /></Page> },
      { path: '/sessions', element: <Page><SessionsPage /></Page> },
      { path: '/movies/:slug', element: <Page><MoviePage /></Page> },
      { path: '/profile', element: <Page><ProfilePage /></Page> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
