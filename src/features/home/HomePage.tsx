import clsx from 'clsx';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Movie } from '@/api/types';
import { useComingSoon, useFeatured, useNowPlaying } from '@/api/queries';
import { formatRuntime } from '@/lib/format';
import { getRecentlyViewed } from '@/lib/recentlyViewed';
import { ComingSoonCard, NowPlayingCard, Poster } from '@/components/MovieCards';
import { buttonClasses } from '@/components/ui/Button';
import { AgeBadge, EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Spinner';
import { ChevronLeft, ChevronRight } from '@/components/ui/icons';

const HERO_INTERVAL = 7000;

function Hero() {
  const featured = useFeatured();
  const nowPlaying = useNowPlaying();
  // Fall back to now-playing titles if nothing is flagged as featured.
  const slides: Movie[] = (featured.data?.length ? featured.data : nowPlaying.data?.slice(0, 5)) ?? [];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), HERO_INTERVAL);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  if (featured.isPending && nowPlaying.isPending) {
    return <Skeleton className="h-[640px] w-full rounded-none" />;
  }
  if (slides.length === 0) {
    if (featured.isError) {
      return (
        <div className="mx-auto max-w-[1600px] px-10 pt-10">
          <ErrorState error={featured.error} onRetry={() => featured.refetch()} />
        </div>
      );
    }
    return null;
  }

  const movie = slides[index % slides.length];
  const go = (delta: number) => setIndex((i) => (i + delta + slides.length) % slides.length);

  return (
    <section
      className="relative h-[640px] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured films"
    >
      {/* key forces the enter animation on every slide change */}
      <div key={movie.id} className="absolute inset-0 animate-fade-in">
        {movie.backdropUrl && (
          <img src={movie.backdropUrl} alt="" className="size-full animate-ken-burns object-cover" />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/80 to-bg/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-bg/30" />

      <div className="relative mx-auto flex h-full max-w-[1600px] items-end gap-10 px-10 pb-20">
        <div key={`text-${movie.id}`} className="max-w-2xl animate-hero-in">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-accent">
            {movie.isComingSoon ? 'Coming soon' : 'Now showing'}
          </p>
          <h1 className="text-6xl font-extrabold leading-[1.05] tracking-tight">{movie.title}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-ink/80">
            <AgeBadge rating={movie.ageRating} />
            <span>{formatRuntime(movie.runtimeMinutes)}</span>
            {movie.genres.length > 0 && <span>· {movie.genres.map((g) => g.name).join(', ')}</span>}
          </div>
          <div className="mt-8 flex gap-3">
            <Link to={`/movies/${movie.slug}`} className={buttonClasses('primary', 'lg')}>
              {movie.isComingSoon ? 'View details' : 'Buy Ticket'}
            </Link>
            <Link to="/sessions" className={buttonClasses('secondary', 'lg')}>
              All sessions
            </Link>
          </div>
        </div>

        {slides.length > 1 && (
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous featured film"
              className="grid size-11 cursor-pointer place-items-center rounded-full border border-line bg-bg/60 backdrop-blur hover:border-ink/40"
            >
              <ChevronLeft />
            </button>
            <div className="flex gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Show ${s.title}`}
                  aria-current={i === index}
                  onClick={() => setIndex(i)}
                  className={clsx(
                    'h-1.5 cursor-pointer rounded-full transition-all duration-500',
                    i === index ? 'w-10 bg-accent' : 'w-4 bg-ink/30 hover:bg-ink/60',
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next featured film"
              className="grid size-11 cursor-pointer place-items-center rounded-full border border-line bg-bg/60 backdrop-blur hover:border-ink/40"
            >
              <ChevronRight />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/** Section title + horizontally scrolling rail with arrow buttons. */
function Rail({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 600, behavior: 'smooth' });

  return (
    <section className="mx-auto max-w-[1600px] px-10 pt-14">
      <div className="mb-5 flex items-end justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex items-center gap-3">
          {action}
          <button type="button" onClick={() => scroll(-1)} aria-label={`Scroll ${title} left`} className="grid size-9 cursor-pointer place-items-center rounded-full border border-line hover:border-ink/40">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label={`Scroll ${title} right`} className="grid size-9 cursor-pointer place-items-center rounded-full border border-line hover:border-ink/40">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div ref={ref} className="rail -mx-2 flex gap-5 overflow-x-auto scroll-smooth px-2 pb-4">
        {children}
      </div>
    </section>
  );
}

function RailSkeleton({ width = 'w-64' }: { width?: string }) {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className={clsx('shrink-0', width)}>
          <Skeleton className="aspect-[2/3] w-full rounded-2xl" />
          <Skeleton className="mt-3 h-4 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </div>
      ))}
    </>
  );
}

function RecentlyViewed() {
  const [items] = useState(getRecentlyViewed);
  if (items.length === 0) return null;

  return (
    <Rail title="Recently Viewed">
      {items.map((m) => (
        <Link key={m.id} to={`/movies/${m.slug}`} className="group w-40 shrink-0">
          <Poster src={m.posterUrl} title={m.title} className="aspect-[2/3] w-full rounded-xl border border-line transition-transform group-hover:-translate-y-1" />
          <p className="mt-2 line-clamp-1 text-sm font-semibold group-hover:text-accent">{m.title}</p>
          <p className="flex items-center gap-2 text-xs text-muted">
            <AgeBadge rating={m.ageRating} className="h-5 text-[10px]" />
            {formatRuntime(m.runtimeMinutes)}
          </p>
        </Link>
      ))}
    </Rail>
  );
}

function NowPlaying() {
  const { data, isPending, isError, error, refetch } = useNowPlaying();
  return (
    <Rail
      title="Now Playing"
      action={
        <Link to="/sessions" className="text-sm font-semibold text-accent hover:underline">
          See All
        </Link>
      }
    >
      {isPending ? (
        <RailSkeleton />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} className="w-full" />
      ) : data.length === 0 ? (
        <EmptyState title="Nothing showing right now" description="Check back soon for new releases." className="w-full" />
      ) : (
        data.map((m) => <NowPlayingCard key={m.id} movie={m} />)
      )}
    </Rail>
  );
}

function ComingSoon() {
  const { data, isPending, isError, error, refetch } = useComingSoon();
  return (
    <Rail title="Coming Soon">
      {isPending ? (
        <RailSkeleton width="w-56" />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} className="w-full" />
      ) : data.length === 0 ? (
        <EmptyState title="No upcoming titles yet" description="New releases will appear here." className="w-full" />
      ) : (
        data.map((m) => <ComingSoonCard key={m.id} movie={m} />)
      )}
    </Rail>
  );
}

export function HomePage() {
  return (
    <>
      <Hero />
      <RecentlyViewed />
      <NowPlaying />
      <ComingSoon />
    </>
  );
}
