import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MovieDetail } from '@/api/types';
import { notifyMe } from '@/api/endpoints';
import { errorMessage, parseApiError } from '@/api/errors';
import { useMovie, useMovieSessions } from '@/api/queries';
import { useAuthStore } from '@/store/auth';
import { toast } from '@/store/toast';
import { formatDate, formatPrice, formatRuntime, isWithinNextSevenDays, todayISO } from '@/lib/format';
import { addRecentlyViewed } from '@/lib/recentlyViewed';
import { ageRestrictionMessage, isAgeRestricted, useRequireAuth, useStartBooking } from '@/lib/guards';
import { Poster } from '@/components/MovieCards';
import { SessionButton } from '@/components/SessionButton';
import { Button, buttonClasses } from '@/components/ui/Button';
import { DateStrip } from '@/components/ui/DateStrip';
import { AgeBadge, Chip, EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Spinner';
import { AlertIcon, BellIcon, CheckIcon, ClockIcon } from '@/components/ui/icons';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

function NotifyButton({ movie }: { movie: MovieDetail }) {
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

  if (movie.isNotified) {
    return (
      <Button variant="secondary" size="lg" disabled icon={<CheckIcon className="size-4" />}>
        You&apos;ll be notified
      </Button>
    );
  }
  return (
    <Button
      size="lg"
      loading={mutation.isPending}
      icon={<BellIcon className="size-4" />}
      onClick={() => requireAuth(() => !mutation.isPending && mutation.mutate())}
    >
      Notify Me
    </Button>
  );
}

function SessionsSection({ movie }: { movie: MovieDetail }) {
  const [params, setParams] = useSearchParams();
  const raw = params.get('date');
  const date = raw && isWithinNextSevenDays(raw) ? raw : todayISO();
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.ready);
  const startBooking = useStartBooking();
  const sessions = useMovieSessions(movie.slug, date);
  const blocked = isAgeRestricted(user, movie.ageRating);

  // Arriving from a session card (`?session=<id>`): open seat selection straight away.
  // Waits for the session restore so a signed-in user isn't asked to log in again.
  const requested = Number(params.get('session')) || null;
  const handled = useRef<number | null>(null);
  useEffect(() => {
    if (!requested || !authReady || handled.current === requested) return;
    handled.current = requested;
    setParams(
      (p) => {
        p.delete('session');
        return p;
      },
      { replace: true, preventScrollReset: true },
    );
    startBooking(requested, movie.ageRating);
  }, [requested, authReady, setParams, startBooking, movie.ageRating]);

  return (
    <section id="sessions" className="mx-auto max-w-[1600px] scroll-mt-24 px-10 pt-14">
      <div className="mb-6 flex items-end justify-between gap-8">
        <h2 className="text-2xl font-bold">Sessions</h2>
        <DateStrip
          value={date}
          onChange={(d) => setParams({ date: d }, { replace: true, preventScrollReset: true })}
          className="w-[640px]"
        />
      </div>

      {blocked && (
        <p className="mb-5 flex items-center gap-2 rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad">
          <AlertIcon className="size-4 shrink-0" />
          {ageRestrictionMessage(movie.ageRating)}
        </p>
      )}

      {sessions.isPending ? (
        <div className="flex flex-col gap-6">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i}>
              <Skeleton className="mb-3 h-5 w-48" />
              <div className="flex gap-3">
                {Array.from({ length: 4 }, (_, j) => (
                  <Skeleton key={j} className="h-28 w-52 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : sessions.isError ? (
        <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} title="Couldn't load sessions" />
      ) : sessions.data.every((g) => g.sessions.length === 0) ? (
        <EmptyState
          icon={<ClockIcon className="size-10" />}
          title="No sessions on this date"
          description="This film has no showings on the selected day. Try another date."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {sessions.data
            .filter((g) => g.sessions.length > 0)
            .map((group) => (
              <div key={group.venue.id} className="rounded-2xl border border-line bg-surface p-5">
                <h3 className="mb-4 flex items-baseline gap-2">
                  <span className="text-lg font-bold">{group.venue.name}</span>
                  <span className="text-sm text-muted">{group.venue.city}</span>
                </h3>
                <div className="flex flex-wrap gap-3">
                  {group.sessions.map((s) => (
                    <SessionButton
                      key={s.id}
                      session={s}
                      showVenue={false}
                      blocked={blocked}
                      onSelect={() => startBooking(s.id, movie.ageRating)}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}

export function MoviePage() {
  const { slug = '' } = useParams();
  const { data: movie, isPending, isError, error, refetch } = useMovie(slug);

  useEffect(() => {
    if (movie) addRecentlyViewed(movie);
  }, [movie]);

  if (isPending) {
    return (
      <div>
        <Skeleton className="h-[520px] w-full rounded-none" />
        <div className="mx-auto max-w-[1600px] px-10 pt-10">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="mt-4 h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (isError) {
    const notFound = parseApiError(error).kind === 'notFound';
    return (
      <div className="mx-auto max-w-[1600px] px-10 py-20">
        {notFound ? (
          <EmptyState
            title="Film not found"
            description="This title doesn't exist or is no longer listed."
            action={
              <Link to="/sessions" className={buttonClasses()}>
                Browse sessions
              </Link>
            }
          />
        ) : (
          <ErrorState error={error} onRetry={() => refetch()} />
        )}
      </div>
    );
  }

  const cast = movie.cast?.split(',').map((c) => c.trim()).filter(Boolean) ?? [];

  return (
    <div>
      <section className="relative h-[560px] overflow-hidden">
        {movie.backdropUrl && (
          <img src={movie.backdropUrl} alt="" className="absolute inset-0 size-full animate-ken-burns object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/85 to-bg/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/10 to-transparent" />

        <div className="relative mx-auto flex h-full max-w-[1600px] items-end gap-10 px-10 pb-12">
          <Poster
            src={movie.posterUrl}
            title={movie.title}
            className="hidden h-[400px] w-[267px] shrink-0 rounded-2xl border border-line shadow-2xl lg:block"
          />
          <div className="max-w-3xl animate-hero-in">
            {movie.isComingSoon && (
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-warn">
                Coming {formatDate(movie.releaseDate)}
              </p>
            )}
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight">{movie.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <AgeBadge rating={movie.ageRating} />
              <span className="flex items-center gap-1.5 text-ink/80">
                <ClockIcon className="size-4" /> {formatRuntime(movie.runtimeMinutes)}
              </span>
              {movie.genres.map((g) => (
                <Chip key={g.id} className="normal-case tracking-normal">
                  {g.name}
                </Chip>
              ))}
            </div>
            {movie.synopsis && <p className="mt-5 max-w-2xl leading-relaxed text-ink/85">{movie.synopsis}</p>}
            <div className="mt-6 flex items-center gap-4">
              {movie.isComingSoon ? (
                <NotifyButton movie={movie} />
              ) : (
                <>
                  <a href="#sessions" className={buttonClasses('primary', 'lg')}>
                    Buy Ticket
                  </a>
                  {movie.fromPrice !== null && (
                    <span className="text-sm text-muted">
                      Tickets from <span className="font-bold text-ink">{formatPrice(movie.fromPrice)}</span>
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-10 pt-10">
        <dl className="grid grid-cols-4 gap-8 rounded-2xl border border-line bg-surface p-6">
          <Fact label="Director">{movie.director || '—'}</Fact>
          <Fact label="Starring">{cast.length ? cast.join(', ') : '—'}</Fact>
          <Fact label="Release date">{formatDate(movie.releaseDate)}</Fact>
          <Fact label="Runtime">{formatRuntime(movie.runtimeMinutes)}</Fact>
          <Fact label="Genre">{movie.genres.map((g) => g.name).join(', ') || '—'}</Fact>
          <Fact label="Age rating">
            <span className="flex items-start gap-2">
              <AgeBadge rating={movie.ageRating} />
              <span className="text-muted">{movie.ageRating.description}</span>
            </span>
          </Fact>
          <Fact label="Available formats">
            {movie.formats.length ? (
              <span className="flex flex-wrap gap-1.5">
                {movie.formats.map((f) => (
                  <Chip key={f.id}>{f.name}</Chip>
                ))}
              </span>
            ) : (
              '—'
            )}
          </Fact>
        </dl>
      </section>

      {movie.isComingSoon ? (
        <section className="mx-auto max-w-[1600px] px-10 pt-14">
          <EmptyState
            icon={<BellIcon className="size-10" />}
            title="Not in cinemas yet"
            description={`${movie.title} opens on ${formatDate(movie.releaseDate)}. Sessions will appear here once tickets go on sale.`}
          />
        </section>
      ) : (
        <SessionsSection movie={movie} />
      )}
    </div>
  );
}
