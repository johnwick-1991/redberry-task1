import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSearch } from '@/api/queries';
import { formatRuntime } from '@/lib/format';
import { AgeBadge } from '@/components/ui/States';
import { SearchIcon } from '@/components/ui/icons';
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

  const showPanel = open && debounced.trim().length > 0;

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
        placeholder="Search films"
        aria-label="Search films"
        className="h-10 w-full rounded-full border border-line bg-surface-2 pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-muted focus:border-ink/40"
      />
      {isFetching && <Spinner className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />}

      {showPanel && (
        <div className="absolute left-0 right-0 top-12 z-40 animate-fade-in overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
          {isError ? (
            <p className="px-4 py-3 text-sm text-bad">Search failed. Please try again.</p>
          ) : data.length === 0 && !isFetching ? (
            <p className="px-4 py-3 text-sm text-muted">No films match “{debounced.trim()}”.</p>
          ) : (
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
                        <AgeBadge rating={m.ageRating} className="h-5 text-[10px]" />
                        {formatRuntime(m.runtimeMinutes)}
                        {m.isComingSoon && <span className="text-warn">Coming soon</span>}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
