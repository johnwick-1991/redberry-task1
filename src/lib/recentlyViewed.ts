import type { Movie } from '@/api/types';

const KEY = 'kino.recentlyViewed';
const MAX = 10;

/** A small snapshot so the home page can render the row without extra requests. */
export type RecentMovie = Pick<
  Movie,
  'id' | 'slug' | 'title' | 'posterUrl' | 'runtimeMinutes' | 'ageRating' | 'isComingSoon'
>;

export function getRecentlyViewed(): RecentMovie[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as RecentMovie[]) : [];
  } catch {
    return [];
  }
}

export function addRecentlyViewed(movie: Movie): void {
  const entry: RecentMovie = {
    id: movie.id,
    slug: movie.slug,
    title: movie.title,
    posterUrl: movie.posterUrl,
    runtimeMinutes: movie.runtimeMinutes,
    ageRating: movie.ageRating,
    isComingSoon: movie.isComingSoon,
  };
  try {
    const next = [entry, ...getRecentlyViewed().filter((m) => m.id !== movie.id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: the row simply stays empty */
  }
}
