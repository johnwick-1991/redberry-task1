import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Movie } from '@/api/types';
import { notifyMe } from '@/api/endpoints';
import { errorMessage } from '@/api/errors';
import { formatDayMonth, formatPrice, formatRuntime } from '@/lib/format';
import { useRequireAuth } from '@/lib/guards';
import { toast } from '@/store/toast';
import { buttonClasses } from '@/components/ui/Button';
import { AgeBadge } from '@/components/ui/States';
import { FigmaIcon, FilmIcon } from '@/components/ui/icons';

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

function genreLine(movie: Movie) {
  const genre = movie.genres[0]?.name;
  return [genre, formatRuntime(movie.runtimeMinutes)].filter(Boolean).join(' · ');
}

/** Now Playing ("Card_big"): poster, title, genre · runtime, rating, from price and Buy Ticket. */
export function NowPlayingCard({ movie }: { movie: Movie }) {
  return (
    <article className="group flex h-[452px] w-[260px] shrink-0 flex-col gap-2.5 rounded-[20px] bg-surface p-3 shadow-[0_1px_2px_rgb(0_0_0/0.2)]">
      <Link to={`/movies/${movie.slug}`} className="relative block h-[300px] shrink-0 overflow-hidden rounded-[14px]">
        <Poster src={movie.posterUrl} title={movie.title} className="size-full transition-transform duration-500 group-hover:scale-[1.03]" />
        {movie.kind !== 'film' && (
          <span className="absolute right-2 top-2 rounded-full bg-accent px-2 py-1 text-[10px] font-semibold uppercase">
            Event
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-[7px]">
        <Link to={`/movies/${movie.slug}`} className="line-clamp-1 text-lg font-extrabold hover:text-accent">
          {movie.title}
        </Link>
        <p className="text-xs text-muted">{genreLine(movie)}</p>
        <AgeBadge rating={movie.ageRating} className="self-start px-[7px]" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">{movie.fromPrice !== null && `From ${formatPrice(movie.fromPrice)}`}</span>
        <Link to={`/movies/${movie.slug}`} className={buttonClasses('primary', 'sm')}>
          Buy Ticket
        </Link>
      </div>
    </article>
  );
}

/** Coming Soon ("Card_medium"): no sessions, so the action is Notify Me rather than booking. */
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

  const notifyClass =
    'inline-flex cursor-pointer items-center gap-1 rounded-full border border-muted px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-tint-white disabled:cursor-default disabled:opacity-60';

  return (
    <article className="flex h-40 w-[470px] shrink-0 items-center gap-[15px] rounded-[20px] bg-surface p-3 shadow-[0_1px_2px_rgb(0_0_0/0.2)]">
      <Link to={`/movies/${movie.slug}`} className="block h-full flex-1 overflow-hidden rounded-[14px]">
        <Poster src={movie.backdropUrl ?? movie.posterUrl} title={movie.title} className="size-full" />
      </Link>
      <div className="flex h-[132px] w-[200px] shrink-0 flex-col items-start justify-between">
        <div className="flex flex-col items-start gap-[7px]">
          <p className="text-xs font-semibold uppercase text-accent">In cinemas {formatDayMonth(movie.releaseDate)}</p>
          <Link to={`/movies/${movie.slug}`} className="line-clamp-1 text-xs font-semibold hover:text-accent">
            {movie.title}
          </Link>
          <p className="text-xs text-muted">{genreLine(movie)}</p>
          <AgeBadge rating={movie.ageRating} className="px-[7px]" />
        </div>
        {movie.isNotified ? (
          <button type="button" disabled className={notifyClass}>
            <FigmaIcon name="confirm" className="size-3" /> You&apos;ll be notified
          </button>
        ) : (
          <button
            type="button"
            disabled={mutation.isPending}
            className={notifyClass}
            onClick={() => requireAuth(() => !mutation.isPending && mutation.mutate())}
          >
            <FigmaIcon name="bell" className="size-4" /> Notify Me
          </button>
        )}
      </div>
    </article>
  );
}
