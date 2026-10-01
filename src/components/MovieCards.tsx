import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Movie } from '@/api/types';
import { notifyMe } from '@/api/endpoints';
import { errorMessage } from '@/api/errors';
import { formatDate, formatPrice, formatRuntime } from '@/lib/format';
import { useRequireAuth } from '@/lib/guards';
import { toast } from '@/store/toast';
import { Button, buttonClasses } from '@/components/ui/Button';
import { AgeBadge } from '@/components/ui/States';
import { BellIcon, CheckIcon, FilmIcon } from '@/components/ui/icons';

export function Poster({ src, title, className }: { src: string | null; title: string; className?: string }) {
  return (
    <div className={clsx('overflow-hidden bg-surface-3', className)}>
      {src ? (
        <img src={src} alt={`${title} poster`} loading="lazy" className="size-full object-cover" />
      ) : (
        <div className="grid size-full place-items-center text-muted">
          <FilmIcon className="size-10" />
        </div>
      )}
    </div>
  );
}

/** Now Playing: large card with poster, rating, runtime, starting price and Buy Ticket. */
export function NowPlayingCard({ movie }: { movie: Movie }) {
  return (
    <article className="group flex w-64 shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-all hover:-translate-y-1 hover:border-ink/25 hover:shadow-2xl">
      <Link to={`/movies/${movie.slug}`} className="relative block">
        <Poster src={movie.posterUrl} title={movie.title} className="aspect-[2/3] w-full transition-transform duration-500 group-hover:scale-[1.03]" />
        <AgeBadge rating={movie.ageRating} className="absolute left-3 top-3 shadow-lg backdrop-blur" />
        {movie.kind !== 'film' && (
          <span className="absolute right-3 top-3 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold uppercase">
            Event
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link to={`/movies/${movie.slug}`} className="line-clamp-1 text-base font-bold hover:text-accent">
          {movie.title}
        </Link>
        <div className="flex items-center justify-between text-sm text-muted">
          <span>{formatRuntime(movie.runtimeMinutes)}</span>
          {movie.fromPrice !== null && (
            <span className="font-semibold text-ink">from {formatPrice(movie.fromPrice)}</span>
          )}
        </div>
        <Link to={`/movies/${movie.slug}`} className={buttonClasses('primary', 'md', 'mt-auto w-full')}>
          Buy Ticket
        </Link>
      </div>
    </article>
  );
}

/** Coming Soon: no sessions, so the action is Notify Me rather than booking. */
export function ComingSoonCard({ movie }: { movie: Movie }) {
  const requireAuth = useRequireAuth();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => notifyMe(movie.slug),
    onSuccess: () => {
      toast(`We'll let you know when ${movie.title} opens.`, 'success');
      queryClient.invalidateQueries({ queryKey: ['movies'] });
    },
    onError: (error) => toast(errorMessage(error), 'error'),
  });

  return (
    <article className="flex w-56 shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      <Link to={`/movies/${movie.slug}`} className="relative block">
        <Poster src={movie.posterUrl} title={movie.title} className="aspect-[2/3] w-full" />
        <span className="absolute bottom-3 left-3 rounded-md bg-black/70 px-2 py-1 text-xs font-semibold backdrop-blur">
          {formatDate(movie.releaseDate)}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link to={`/movies/${movie.slug}`} className="line-clamp-1 font-bold hover:text-accent">
          {movie.title}
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted">
          <AgeBadge rating={movie.ageRating} />
          <span>{formatRuntime(movie.runtimeMinutes)}</span>
        </div>
        <div className="mt-auto pt-1">
          {movie.isNotified ? (
            <Button variant="secondary" disabled className="w-full" icon={<CheckIcon className="size-4" />}>
              You&apos;ll be notified
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="w-full"
              loading={mutation.isPending}
              icon={<BellIcon className="size-4" />}
              onClick={() => requireAuth(() => !mutation.isPending && mutation.mutate())}
            >
              Notify Me
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
