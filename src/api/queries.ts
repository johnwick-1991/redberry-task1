import { useQuery } from '@tanstack/react-query';
import * as endpoints from './endpoints';
import type { SessionsQuery, TicketsFilter } from './types';
import { useAuthStore } from '@/store/auth';

export const qk = {
  filterOptions: ['filter-options'] as const,
  featured: ['movies', 'featured'] as const,
  nowPlaying: ['movies', 'now-playing'] as const,
  comingSoon: ['movies', 'coming-soon'] as const,
  movie: (slug: string) => ['movies', 'detail', slug] as const,
  movieSessions: (slug: string, date: string) => ['movies', 'sessions', slug, date] as const,
  sessions: (q: SessionsQuery) => ['sessions', 'list', q] as const,
  session: (id: number) => ['sessions', 'detail', id] as const,
  seatMap: (id: number) => ['sessions', 'seats', id] as const,
  tickets: (filter: TicketsFilter) => ['tickets', filter] as const,
  search: (q: string) => ['search', q] as const,
};

/** Loaded once at boot and cached for the whole session. */
export function useFilterOptions() {
  return useQuery({
    queryKey: qk.filterOptions,
    queryFn: endpoints.fetchFilterOptions,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useFeatured() {
  return useQuery({ queryKey: qk.featured, queryFn: endpoints.fetchFeatured });
}

export function useNowPlaying() {
  return useQuery({ queryKey: qk.nowPlaying, queryFn: () => endpoints.fetchNowPlaying() });
}

export function useComingSoon() {
  return useQuery({ queryKey: qk.comingSoon, queryFn: () => endpoints.fetchComingSoon() });
}

export function useMovie(slug: string) {
  return useQuery({ queryKey: qk.movie(slug), queryFn: () => endpoints.fetchMovie(slug) });
}

export function useMovieSessions(slug: string, date: string, enabled = true) {
  return useQuery({
    queryKey: qk.movieSessions(slug, date),
    queryFn: () => endpoints.fetchMovieSessions(slug, date),
    enabled,
  });
}

export function useSessions(q: SessionsQuery, enabled = true) {
  return useQuery({
    queryKey: qk.sessions(q),
    queryFn: ({ signal }) => endpoints.fetchSessions(q, signal),
    enabled,
  });
}

export function useSession(id: number) {
  return useQuery({ queryKey: qk.session(id), queryFn: () => endpoints.fetchSession(id) });
}

export function useSeatMap(id: number) {
  return useQuery({
    queryKey: qk.seatMap(id),
    queryFn: () => endpoints.fetchSeatMap(id),
    // Seat availability is live: always refetch when the modal opens.
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useTickets(filter: TicketsFilter) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: qk.tickets(filter),
    queryFn: () => endpoints.fetchTickets(filter),
    enabled: token !== null,
  });
}

export function useSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: qk.search(term),
    queryFn: ({ signal }) => endpoints.searchMovies(term, signal),
    enabled: term.length > 0,
    staleTime: 60_000,
  });
}
