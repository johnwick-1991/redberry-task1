import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSearch } from '@/api/queries';
import { formatPrice, formatRuntime } from '@/lib/format';
import { AgeBadge } from '@/components/ui/States';
import { FilmIcon, SearchIcon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Header typeahead: GET /search, debounced, at most 6 results. */
export function SearchBox() {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const debounced = useDebounced(term, 300);
  const { data = [], isFetching, isError } = useSearch(debounced);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => setActive(-1), [data]);

  const go = (slug: string) => {
    setOpen(false);
    setTerm('');
    navigate(`/movies/${slug}`);
  };

  const query = debounced.trim();
  const showPanel = open;

  const browseAll = (
    <Link
      to="/sessions"
      onClick={() => setOpen(false)}
      className="mt-3 inline-flex rounded-full bg-surface-3 px-4 py-2 text-xs font-semibold hover:bg-line"
    >
      Browse all sessions
    </Link>
  );

  return (
    <div ref={wrapRef} className="relative w-80">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, data.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter' && active >= 0 && data[active]) {
            go(data[active].slug);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder="Search films and live events"
        aria-label="Search films"
        className="h-10 w-full rounded-full border border-line bg-surface-2 pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-muted focus:border-ink/40"
      />
      {isFetching && <Spinner className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />}

      {showPanel && (
        <div className="absolute right-0 top-12 z-40 w-[26rem] animate-fade-in overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
          {isError ? (
            <p className="px-4 py-3 text-sm text-bad">Search failed. Please try again.</p>
          ) : !query ? (
            <div className="flex flex-col items-center px-6 py-6 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-surface-3 text-muted">
                <FilmIcon className="size-5" />
              </span>
              <p className="mt-3 text-sm font-semibold">What do you want to watch?</p>
              <p className="mt-1 text-xs text-muted">Search by film or event title.</p>
              {browseAll}
            </div>
          ) : data.length === 0 && !isFetching ? (
            <div className="flex flex-col items-center px-6 py-6 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-surface-3 text-muted">
                <SearchIcon className="size-5" />
              </span>
              <p className="mt-3 text-sm font-semibold">No results for “{query}”</p>
              <p className="mt-1 text-xs text-muted">Check the spelling or try another film or live event.</p>
              {browseAll}
            </div>
          ) : (
            <>
              <p className="flex items-center justify-between px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-muted">
                <span>Films &amp; events</span>
                <span className="normal-case tracking-normal">
                  {data.length} {data.length === 1 ? 'result' : 'results'}
                </span>
              </p>
              <ul role="listbox">
                {data.map((m, i) => (
                  <li key={m.id} role="option" aria-selected={i === active}>
                    <Link
                      to={`/movies/${m.slug}`}
                      onClick={() => {
                        setOpen(false);
                        setTerm('');
                      }}
                      onMouseEnter={() => setActive(i)}
                      className={clsx('flex items-center gap-3 px-3 py-2', i === active && 'bg-surface-3')}
                    >
                      <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-surface-3">
                        {m.posterUrl && <img src={m.posterUrl} alt="" className="size-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{m.title}</p>
                        <p className="flex items-center gap-2 text-xs text-muted">
                          {m.kind === 'event' ? 'Event' : 'Film'}
                          <AgeBadge rating={m.ageRating} className="h-5 text-[10px]" />
                          {formatRuntime(m.runtimeMinutes)}
                        </p>
                      </div>
                      {m.isComingSoon ? (
                        <span className="shrink-0 text-xs font-semibold text-warn">Coming soon</span>
                      ) : (
                        m.fromPrice !== null && (
                          <span className="shrink-0 text-xs font-semibold">from {formatPrice(m.fromPrice)}</span>
                        )
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
