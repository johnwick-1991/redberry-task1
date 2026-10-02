import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MovieDetail, Session } from '@/api/types';
import { notifyMe } from '@/api/endpoints';
import { errorMessage, parseApiError } from '@/api/errors';
import { useMovie, useMovieSessions } from '@/api/queries';
import { useAuthStore } from '@/store/auth';
import { toast } from '@/store/toast';
import {
  formatDate,
  formatDayMonth,
  formatLongDate,
  formatLongDay,
  formatPrice,
  formatRuntime,
  isWithinNextSevenDays,
  todayISO,
} from '@/lib/format';
import { addRecentlyViewed } from '@/lib/recentlyViewed';
import { ageRestrictionMessage, isAgeRestricted, useRequireAuth, useStartBooking } from '@/lib/guards';
import { Poster } from '@/components/MovieCards';
import { SessionTicket } from '@/components/SessionButton';
import { Button, buttonClasses } from '@/components/ui/Button';
import { DateStrip } from '@/components/ui/DateStrip';
import { AgeBadge, Chip, EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Spinner';
import { AlertIcon, BellIcon, CheckIcon, ClockIcon, FigmaIcon } from '@/components/ui/icons';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[7px] font-semibold">
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className="text-sm">{children}</p>
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
  const available = movie.availableDates;
  // Default to today, or to the first day that actually has sessions if today has none.
  const firstAvailable = available?.find(isWithinNextSevenDays);
  const date =
    raw && isWithinNextSevenDays(raw)
      ? raw
      : available && !available.includes(todayISO()) && firstAvailable
        ? firstAvailable
        : todayISO();
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

  const groups = sessions.data?.filter((g) => g.sessions.length > 0) ?? [];
  const total = groups.reduce((n, g) => n + g.sessions.length, 0);

  return (
    <section id="sessions" className="flex min-w-0 flex-1 scroll-mt-6 flex-col gap-[27px] pb-[26px]">
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-[7px]">
          <h2 className="text-xl font-extrabold">Sessions</h2>
          <p className="text-xs text-muted">
            {sessions.isPending ? '\u00a0' : `${total} ${total === 1 ? 'session' : 'sessions'} on ${formatLongDate(date)}`}
          </p>
        </div>
        <DateStrip
          value={date}
          onChange={(d) => setParams({ date: d }, { replace: true, preventScrollReset: true })}
          available={available}
        />
      </div>

      {blocked && (
        <p className="flex items-center gap-2 self-start rounded-xl bg-tint-red px-4 py-3 text-xs font-semibold text-accent">
          <AlertIcon className="size-4 shrink-0" />
          {ageRestrictionMessage(movie.ageRating)}
        </p>
      )}

      {sessions.isPending ? (
        <div className="flex flex-col gap-6">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-[126px] w-[454px] rounded-[18px]" />
            </div>
          ))}
        </div>
      ) : sessions.isError ? (
        <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} title="Couldn't load sessions" />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<ClockIcon className="size-10" />}
          title="No sessions on this date"
          description="This film has no showings on the selected day. Try another date."
        />
      ) : (
        groups.map((group) => (
          <div key={group.venue.id} className="flex flex-col gap-3">
            <h3 className="text-sm font-extrabold">{group.venue.name}</h3>
            <div className="flex flex-wrap gap-2.5">
              {byHall(group.sessions).map(([hall, list]) => (
                <div key={hall} className="flex flex-col gap-[9px] rounded-[18px] bg-surface p-[15px]">
                  <p className="text-xs font-semibold">Hall {hall}</p>
                  <div className="flex flex-wrap gap-[9px]">
                    {list.map((s) => (
                      <SessionTicket key={s.id} session={s} blocked={blocked} onSelect={() => startBooking(s.id, movie.ageRating)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

/** Group a venue's sessions by hall, keeping the API's time order. */
function byHall(sessions: Session[]): [string, Session[]][] {
  const halls = new Map<string, Session[]>();
  sessions.forEach((s) => halls.set(s.hall.name, [...(halls.get(s.hall.name) ?? []), s]));
  return [...halls.entries()];
}

function Details({ movie }: { movie: MovieDetail }) {
  return (
    <aside className="flex w-[441px] shrink-0 flex-col gap-[17px] px-[26px]">
      <h2 className="text-xl font-extrabold">Details</h2>
      <Fact label="Director">{movie.director || '—'}</Fact>
      <Fact label="Main cast">{movie.cast || '—'}</Fact>
      <Fact label="Genre">{movie.genres.map((g) => g.name).join(', ') || '—'}</Fact>
      <Fact label="Duration">{movie.runtimeMinutes} minutes</Fact>
      <Fact label="Release date">{formatLongDay(movie.releaseDate)}</Fact>
      <Fact label="Formats">{movie.formats.map((f) => f.name).join(', ') || '—'}</Fact>
      {movie.fromPrice !== null && <Fact label="From">{formatPrice(movie.fromPrice)}</Fact>}
      <div className="flex flex-col gap-[7px] rounded-xl bg-tint-warn px-[13px] py-[9px] text-xs text-warn">
        <p className="font-semibold">RATING NOTE</p>
        <p className="flex gap-[7px]">
          <span className="font-semibold">{movie.ageRating.code}</span>
          <span className="leading-[1.3]">{movie.ageRating.description}</span>
        </p>
      </div>
    </aside>
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
        <Skeleton className="h-[567px] w-full rounded-none" />
        <div className="px-[51px] pt-10">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="mt-4 h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (isError) {
    const notFound = parseApiError(error).kind === 'notFound';
    return (
      <div className="px-[51px] pb-10 pt-[140px]">
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

  return (
    <div className="flex flex-col gap-[34px]">
      <section className="relative h-[567px] overflow-hidden">
        {movie.backdropUrl && (
          <img src={movie.backdropUrl} alt="" className="absolute inset-0 size-full animate-ken-burns object-cover" />
        )}
        <div className="absolute inset-0 bg-bg/20 backdrop-blur-[5px]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-bg to-transparent" />

        <div className="absolute left-[60px] top-[152px] flex items-end gap-[34px]">
          <Poster
            src={movie.posterUrl}
            title={movie.title}
            className="h-[374px] w-[289px] shrink-0 rounded-[14px] shadow-[0_4px_64px_rgb(0_0_0/0.2)]"
          />
          <div className="flex w-[580px] animate-hero-in flex-col items-start gap-[15px] py-[9px]">
            <span className="rounded-full bg-tint-red px-2.5 py-1.5 text-xs font-semibold uppercase text-accent">
              {movie.isComingSoon ? `Coming ${formatDayMonth(movie.releaseDate)}` : 'Now playing'}
            </span>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-[15px]">
                <h1 className="text-[40px] font-extrabold uppercase">{movie.title}</h1>
                {movie.synopsis && <p className="w-[560px] text-sm leading-[1.3]">{movie.synopsis}</p>}
              </div>
              <div className="flex flex-wrap gap-[7px]">
                <AgeBadge rating={movie.ageRating} className="px-2.5 py-1.5" />
                <Chip className="px-2.5">
                  <FigmaIcon name="timer" className="size-3.5" />
                  {formatRuntime(movie.runtimeMinutes)}
                </Chip>
                {movie.formats.map((f) => (
                  <Chip key={f.id} className="px-2.5 uppercase">
                    {f.name}
                  </Chip>
                ))}
              </div>
            </div>
            {movie.isComingSoon && <NotifyButton movie={movie} />}
          </div>
        </div>
      </section>

      <div className="flex items-start gap-2.5 px-[51px]">
        {movie.isComingSoon ? (
          <section className="min-w-0 flex-1">
            <EmptyState
              icon={<BellIcon className="size-10" />}
              title="Not in cinemas yet"
              description={`${movie.title} opens on ${formatDate(movie.releaseDate)}. Sessions will appear here once tickets go on sale.`}
            />
          </section>
        ) : (
          <SessionsSection movie={movie} />
        )}
        <Details movie={movie} />
      </div>
    </div>
  );
}
