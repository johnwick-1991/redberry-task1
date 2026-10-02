import clsx from 'clsx';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Movie } from '@/api/types';
import { useComingSoon, useFeatured, useMovie, useNowPlaying } from '@/api/queries';
import { formatDayMonth, formatRuntime } from '@/lib/format';
import { getRecentlyViewed } from '@/lib/recentlyViewed';
import { ComingSoonCard, NowPlayingCard, Poster } from '@/components/MovieCards';
import { buttonClasses } from '@/components/ui/Button';
import { AgeBadge, Chip, EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Spinner';
import { FigmaIcon } from '@/components/ui/icons';

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
    return <Skeleton className="h-[760px] w-full rounded-none" />;
  }
  if (slides.length === 0) {
    if (featured.isError) {
      return (
        <div className="px-[70px] pt-[140px]">
          <ErrorState error={featured.error} onRetry={() => featured.refetch()} />
        </div>
      );
    }
    return <div className="h-[140px]" />;
  }

  const movie = slides[index % slides.length];
  const go = (delta: number) => setIndex((i) => (i + delta + slides.length) % slides.length);

  return (
    <section
      className="relative h-[760px] overflow-hidden"
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
      <div className="absolute inset-0 bg-gradient-to-l from-black/10 to-black/80" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />

      <div key={`text-${movie.id}`} className="absolute bottom-[179px] left-[67px] flex w-[580px] animate-hero-in flex-col items-start gap-[15px]">
        <span className="rounded-full bg-tint-red px-2.5 py-1.5 text-xs font-semibold uppercase leading-none text-accent">
          {movie.isComingSoon ? `Coming · ${formatDayMonth(movie.releaseDate)}` : `Premiere · ${formatDayMonth(movie.releaseDate)}`}
        </span>
        <div className="flex w-full flex-col gap-5">
          <div className="flex flex-col gap-[15px]">
            <h1 className="text-[40px] font-extrabold uppercase leading-none">{movie.title}</h1>
            <div className="flex flex-wrap gap-2">
              <AgeBadge rating={movie.ageRating} className="px-3 py-1.5" />
              <Chip>
                <FigmaIcon name="timer" className="size-3.5" />
                {formatRuntime(movie.runtimeMinutes)}
              </Chip>
              {(movie.formats ?? []).map((f) => (
                <Chip key={f.id} className="uppercase">
                  {f.name}
                </Chip>
              ))}
            </div>
            <HeroSynopsis slug={movie.slug} />
          </div>
          <div className="flex gap-2.5">
            <Link to={`/movies/${movie.slug}`} className={buttonClasses('primary')}>
              <FigmaIcon name="ticket" className="size-4" />
              {movie.isComingSoon ? 'View details' : 'Buy tickets'}
            </Link>
            <Link to="/sessions" className={buttonClasses('secondary')}>
              All sessions
            </Link>
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-[42px] left-1/2 flex w-[calc(100%-134px)] -translate-x-1/2 items-center gap-5">
          <div className="flex flex-1 items-center gap-[7px]">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Show ${s.title}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className="flex h-3 flex-1 cursor-pointer items-center"
              >
                <span className={clsx('h-[3px] w-full rounded-full transition-colors duration-500', i === index ? 'bg-accent' : 'bg-white')} />
              </button>
            ))}
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous featured film"
              className="grid size-[54px] cursor-pointer place-items-center rounded-full bg-bg/20 backdrop-blur transition-colors hover:bg-bg/50"
            >
              <FigmaIcon name="arrow-left" className="size-[34px]" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next featured film"
              className="grid size-[54px] cursor-pointer place-items-center rounded-full bg-bg/20 backdrop-blur transition-colors hover:bg-bg/50"
            >
              <FigmaIcon name="arrow-left" className="size-[34px] rotate-180" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** The featured list has no synopsis, so the hero reads it from the film itself. */
function HeroSynopsis({ slug }: { slug: string }) {
  const { data } = useMovie(slug);
  return (
    <p className="line-clamp-3 min-h-[54px] w-[560px] text-sm leading-[1.3]">{data?.synopsis ?? ''}</p>
  );
}

/** Section title + "See all" + a horizontal row that fades out on the right, as in the design. */
function Rail({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-6 px-[70px]">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-extrabold uppercase leading-none">{title}</h2>
        {action}
      </div>
      <div className="relative">
        <div className="rail flex gap-[17px] overflow-x-auto scroll-smooth">
          {children}
        </div>
        <div className="pointer-events-none absolute inset-y-0 -right-[70px] w-40 bg-gradient-to-l from-bg to-transparent" />
      </div>
    </section>
  );
}

function SeeAll() {
  return (
    <Link to="/sessions" className="text-sm font-semibold text-accent hover:underline">
      See all
    </Link>
  );
}

function RailSkeleton({ big = true }: { big?: boolean }) {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className={clsx('shrink-0 rounded-[20px]', big ? 'h-[452px] w-[260px]' : 'h-40 w-[470px]')} />
      ))}
    </>
  );
}

function RecentlyViewed() {
  const [items] = useState(getRecentlyViewed);
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-4 px-[70px]">
      <h2 className="text-lg font-extrabold leading-none">Recently viewed</h2>
      <div className="rail flex gap-3 overflow-x-auto">
        {items.map((m) => (
          <Link
            key={m.id}
            to={`/movies/${m.slug}`}
            className="group flex w-[260px] shrink-0 items-center gap-3 rounded-[14px] bg-surface p-2 transition-colors hover:bg-surface-3"
          >
            <Poster src={m.posterUrl} title={m.title} className="h-[72px] w-[54px] shrink-0 rounded-lg" />
            <div className="flex min-w-0 flex-col items-start gap-1.5">
              <p className="line-clamp-1 text-xs font-extrabold uppercase group-hover:text-accent">{m.title}</p>
              <p className="text-xs text-muted">
                {[m.genre, formatRuntime(m.runtimeMinutes)].filter(Boolean).join(' · ')}
              </p>
              <AgeBadge rating={m.ageRating} className="px-[7px]" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function NowPlaying() {
  const { data, isPending, isError, error, refetch } = useNowPlaying();
  return (
    <Rail title="Now playing" action={<SeeAll />}>
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
    <Rail title="Coming soon..." action={<SeeAll />}>
      {isPending ? (
        <RailSkeleton big={false} />
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
    <div className="flex flex-col gap-8">
      <Hero />
      <div className="flex flex-col gap-10">
        <RecentlyViewed />
        <NowPlaying />
        <div className="h-px bg-surface-3" />
        <ComingSoon />
      </div>
    </div>
  );
}
