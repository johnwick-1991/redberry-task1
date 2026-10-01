import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FilterOptions, SessionsQuery, TimeBand } from '@/api/types';
import { isWithinNextSevenDays, todayISO } from '@/lib/format';

export const DEFAULT_SORT = 'time_asc';

/**
 * The sessions page keeps ALL of its state in the URL, e.g.
 *   /sessions?venue=galleria,batumi&date=2026-11-14&format=max&sort=price_asc&page=2
 * so copy/paste, refresh, and Back/Forward all restore the exact view.
 */
export interface SessionsUrlState {
  date: string;
  venues: string[];
  formats: string[];
  languages: string[];
  bands: TimeBand[];
  search: string;
  sort: string;
  page: number;
}

const list = (value: string | null) =>
  value ? value.split(',').map((v) => v.trim()).filter(Boolean) : [];

function parse(params: URLSearchParams): SessionsUrlState {
  const date = params.get('date');
  const page = Number(params.get('page'));
  return {
    date: date && isWithinNextSevenDays(date) ? date : todayISO(),
    venues: list(params.get('venue')),
    formats: list(params.get('format')),
    languages: list(params.get('language')),
    bands: list(params.get('time')) as TimeBand[],
    search: params.get('q') ?? '',
    sort: params.get('sort') || DEFAULT_SORT,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

function serialize(state: SessionsUrlState): URLSearchParams {
  const p = new URLSearchParams();
  if (state.venues.length) p.set('venue', state.venues.join(','));
  p.set('date', state.date);
  if (state.formats.length) p.set('format', state.formats.join(','));
  if (state.languages.length) p.set('language', state.languages.join(','));
  if (state.bands.length) p.set('time', state.bands.join(','));
  if (state.search) p.set('q', state.search);
  if (state.sort !== DEFAULT_SORT) p.set('sort', state.sort);
  if (state.page > 1) p.set('page', String(state.page));
  return p;
}

/** Formats available in the selected venues; every format when no venue is selected. */
export function availableFormats(options: FilterOptions | undefined, venues: string[]) {
  if (!options) return [];
  if (venues.length === 0) return options.formats;
  const allowed = new Set(
    options.venues.filter((v) => venues.includes(v.slug)).flatMap((v) => v.formats.map((f) => f.slug)),
  );
  return options.formats.filter((f) => allowed.has(f.slug));
}

export function useSessionsUrlState(options: FilterOptions | undefined) {
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => parse(params), [params]);

  /**
   * Apply a change. Any filter, sort or search change sends the user back to
   * page 1, so someone on page 4 never lands on an empty page 4.
   */
  const update = useCallback(
    (patch: Partial<SessionsUrlState>, opts: { replace?: boolean } = {}) => {
      const next: SessionsUrlState = { ...state, ...patch };
      if (!('page' in patch)) next.page = 1;

      // Selecting venues narrows the formats; drop any selected format they don't have.
      if ('venues' in patch && options) {
        const allowed = new Set(availableFormats(options, next.venues).map((f) => f.slug));
        next.formats = next.formats.filter((f) => allowed.has(f));
      }
      setParams(serialize(next), { replace: opts.replace });
    },
    [state, options, setParams],
  );

  const clearFilters = useCallback(() => {
    // Everything except the date (and the chosen sort order) is cleared.
    update({ venues: [], formats: [], languages: [], bands: [], search: '' });
  }, [update]);

  /** The query actually sent: formats the selected venues can't show are ignored. */
  const query: SessionsQuery = useMemo(() => {
    const allowed = new Set(availableFormats(options, state.venues).map((f) => f.slug));
    return {
      ...state,
      formats: options ? state.formats.filter((f) => allowed.has(f)) : state.formats,
    };
  }, [state, options]);

  const activeCount =
    state.venues.length + query.formats.length + state.languages.length + state.bands.length;

  return { state, query, update, clearFilters, activeCount };
}
