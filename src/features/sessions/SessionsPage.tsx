import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { SessionGroup } from '@/api/types';
import { useFilterOptions, useSessions } from '@/api/queries';
import { useAuthStore } from '@/store/auth';
import { formatRuntime } from '@/lib/format';
import { ageRestrictionMessage, isAgeRestricted } from '@/lib/guards';
import { Poster } from '@/components/MovieCards';
import { SessionButton } from '@/components/SessionButton';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { AgeBadge, EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Spinner';
import { AlertIcon, ChevronDown, FigmaIcon, FilmIcon } from '@/components/ui/icons';
import { FiltersSidebar } from './FiltersSidebar';
import { DEFAULT_SORT, useSessionsUrlState } from './useSessionsUrlState';

function MovieGroup({ group }: { group: SessionGroup }) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { movie, sessions } = group;
  const blocked = isAgeRestricted(user, movie.ageRating);

  return (
    <article className="flex flex-col gap-3.5">
      <div className="flex items-center gap-4">
        <Link to={`/movies/${movie.slug}`} className="shrink-0">
          <Poster src={movie.posterUrl} title={movie.title} className="h-20 w-14 rounded-lg" />
        </Link>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Link to={`/movies/${movie.slug}`} className="text-lg font-extrabold hover:text-accent">
              {movie.title}
            </Link>
            <AgeBadge rating={movie.ageRating} />
          </div>
          <span className="text-sm text-muted">{formatRuntime(movie.runtimeMinutes)}</span>
        </div>
      </div>
      {blocked && (
        <p className="flex items-center gap-2 self-start rounded-xl bg-tint-red px-3 py-2 text-xs font-semibold text-accent">
          <AlertIcon className="size-4 shrink-0" />
          {ageRestrictionMessage(movie.ageRating)}
        </p>
      )}
      <div className="rail flex gap-3 overflow-x-auto">
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
    </article>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading sessions">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex flex-col gap-3.5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-14 rounded-lg" />
            <div className="flex flex-col gap-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="flex gap-3">
            {Array.from({ length: 4 }, (_, j) => (
              <Skeleton key={j} className="h-[98px] w-[252px] rounded-2xl" />
            ))}
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
    <div className="px-[51px] pt-[117px]">
      <div className="mb-9 flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold">Sessions</h1>
        <p className="text-sm text-muted">Browse showtimes across all venues</p>
      </div>

      <div className="flex items-start gap-[51px]">
        <FiltersSidebar
          options={options.data}
          state={state}
          selectedFormats={query.formats}
          activeCount={activeCount}
          onChange={(patch) => update(patch)}
          onClear={clearFilters}
        />

        <section className="min-w-0 flex-1">
          <div className="mb-6 flex items-center gap-6">
            <div className="flex-1 text-xs font-semibold" aria-live="polite">
              {loading ? (
                <Skeleton className="h-4 w-32" />
              ) : meta && meta.totalSessions > 0 ? (
                <>Showing {meta.totalSessions} {meta.totalSessions === 1 ? 'session' : 'sessions'}</>
              ) : sessions.isError ? null : (
                'No sessions found'
              )}
            </div>
            <div className="relative w-64">
              <FigmaIcon name="search" className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search by film title"
                aria-label="Search sessions by film title"
                className="h-9 w-full rounded-full bg-surface pl-8 pr-3 text-xs font-semibold outline-none placeholder:text-muted focus:bg-surface-3"
              />
            </div>
            <label className="relative flex items-center gap-1.5 text-xs text-muted">
              Sort:
              <select
                value={state.sort}
                onChange={(e) => update({ sort: e.target.value })}
                className="cursor-pointer appearance-none bg-transparent pr-5 text-xs font-extrabold text-ink outline-none"
              >
                {(options.data?.sorts ?? [{ id: DEFAULT_SORT, label: 'Showtime: earliest first' }]).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-0 size-4 text-ink" />
            </label>
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
            <div className="flex flex-col gap-8">
              {groups.map((g, i) => (
                <div key={g.movie.id} className="flex flex-col gap-8">
                  {i > 0 && <div className="h-px bg-surface-3" />}
                  <MovieGroup group={g} />
                </div>
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
