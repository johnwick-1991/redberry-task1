import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { SessionGroup } from '@/api/types';
import { useFilterOptions, useSessions } from '@/api/queries';
import { useAuthStore } from '@/store/auth';
import { formatLongDate, formatRuntime } from '@/lib/format';
import { ageRestrictionMessage, isAgeRestricted } from '@/lib/guards';
import { Poster } from '@/components/MovieCards';
import { SessionButton } from '@/components/SessionButton';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { AgeBadge, EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Spinner';
import { AlertIcon, FilmIcon, SearchIcon } from '@/components/ui/icons';
import { FiltersSidebar } from './FiltersSidebar';
import { DEFAULT_SORT, useSessionsUrlState } from './useSessionsUrlState';

function MovieGroup({ group }: { group: SessionGroup }) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { movie, sessions } = group;
  const blocked = isAgeRestricted(user, movie.ageRating);

  return (
    <article className="flex gap-6 rounded-2xl border border-line bg-surface p-5">
      <Link to={`/movies/${movie.slug}`} className="shrink-0">
        <Poster src={movie.posterUrl} title={movie.title} className="h-48 w-32 rounded-xl" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <Link to={`/movies/${movie.slug}`} className="truncate text-xl font-bold hover:text-accent">
            {movie.title}
          </Link>
          <AgeBadge rating={movie.ageRating} />
          <span className="text-sm text-muted">{formatRuntime(movie.runtimeMinutes)}</span>
        </div>
        {movie.genres.length > 0 && (
          <p className="mt-1 text-sm text-muted">{movie.genres.map((g) => g.name).join(' · ')}</p>
        )}
        {blocked && (
          <p className="mt-3 flex items-center gap-2 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">
            <AlertIcon className="size-4 shrink-0" />
            {ageRestrictionMessage(movie.ageRating)}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          {sessions.map((s) => (
            <SessionButton
              key={s.id}
              session={s}
              blocked={blocked}
              // Per the design: open the film's page, which then opens seat selection for this session.
              onSelect={() => navigate(`/movies/${movie.slug}?date=${s.date}&session=${s.id}`)}
            />
          ))}
        </div>
      </div>
    </article>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading sessions">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex gap-6 rounded-2xl border border-line bg-surface p-5">
          <Skeleton className="h-48 w-32 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="mt-2 h-4 w-1/4" />
            <div className="mt-5 flex gap-3">
              {Array.from({ length: 4 }, (_, j) => (
                <Skeleton key={j} className="h-28 w-52 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SessionsPage() {
  const options = useFilterOptions();
  const { state, query, update, clearFilters, activeCount } = useSessionsUrlState(options.data);
  // Wait for filter options so the first request already has the narrowed formats.
  const sessions = useSessions(query, !options.isPending);

  // Search box: local state for typing, debounced into the URL (replace, to keep history clean).
  const [term, setTerm] = useState(state.search);
  useEffect(() => setTerm(state.search), [state.search]);
  useEffect(() => {
    if (term === state.search) return;
    const t = setTimeout(() => update({ search: term.trim() }, { replace: true }), 400);
    return () => clearTimeout(t);
  }, [term, state.search, update]);

  const meta = sessions.data?.meta;
  const groups = sessions.data?.data ?? [];
  const loading = options.isPending || sessions.isPending;

  return (
    <div className="mx-auto max-w-[1600px] px-10 py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight">Sessions</h1>
        <p className="mt-2 text-muted">{formatLongDate(state.date)}</p>
      </div>

      <div className="flex items-start gap-8">
        <FiltersSidebar
          options={options.data}
          state={state}
          selectedFormats={query.formats}
          activeCount={activeCount}
          onChange={(patch) => update(patch)}
          onClear={clearFilters}
        />

        <section className="min-w-0 flex-1">
          <div className="mb-5 flex items-center gap-4">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search by film title"
                aria-label="Search sessions by film title"
                className="h-11 w-full rounded-lg border border-line bg-surface pl-10 pr-3 text-sm outline-none focus:border-ink/40"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted">
              Sort by
              <select
                value={state.sort}
                onChange={(e) => update({ sort: e.target.value })}
                className="h-11 cursor-pointer rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-ink/40"
              >
                {(options.data?.sorts ?? [{ id: DEFAULT_SORT, label: 'Showtime: earliest first' }]).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mb-4 h-5 text-sm text-muted" aria-live="polite">
            {loading ? (
              <Skeleton className="h-4 w-36" />
            ) : meta && meta.totalSessions > 0 ? (
              <>
                Showing <span className="font-semibold text-ink">{meta.totalSessions}</span>{' '}
                {meta.totalSessions === 1 ? 'session' : 'sessions'}
                {' · '}
                {meta.totalMovies} {meta.totalMovies === 1 ? 'film' : 'films'}
              </>
            ) : sessions.isError ? null : (
              'No sessions found'
            )}
          </div>

          {loading ? (
            <ListSkeleton />
          ) : sessions.isError ? (
            <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} title="Couldn't load sessions" />
          ) : groups.length === 0 ? (
            meta && state.page > meta.lastPage && meta.totalMovies > 0 ? (
              <EmptyState
                title="This page is empty"
                description={`There are only ${meta.lastPage} pages of results.`}
                action={<Button onClick={() => update({ page: 1 })}>Go to page 1</Button>}
              />
            ) : (
              <EmptyState
                icon={<FilmIcon className="size-10" />}
                title="No sessions found"
                description={
                  activeCount > 0 || state.search
                    ? 'Nothing matches these filters on this date. Try removing a filter or picking another day.'
                    : 'There are no sessions on this date. Try another day.'
                }
                action={
                  activeCount > 0 || state.search ? (
                    <Button variant="secondary" onClick={clearFilters}>
                      Clear All Filters
                    </Button>
                  ) : undefined
                }
              />
            )
          ) : (
            <div className="flex flex-col gap-5">
              {groups.map((g) => (
                <MovieGroup key={g.movie.id} group={g} />
              ))}
              {meta && (
                <div className="mt-4">
                  <Pagination
                    page={meta.currentPage}
                    lastPage={meta.lastPage}
                    onChange={(page) => {
                      update({ page });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
