import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from './icons';

/** 1 … 4 5 [6] 7 8 … 20 */
function pageList(current: number, last: number): (number | '…')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages = new Set([1, last, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

export function Pagination({
  page,
  lastPage,
  onChange,
}: {
  page: number;
  lastPage: number;
  onChange: (page: number) => void;
}) {
  if (lastPage <= 1) return null;

  const arrow =
    'grid size-10 cursor-pointer place-items-center rounded-full bg-surface transition-colors hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <nav aria-label="Pagination" className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page" className={arrow}>
          <ChevronLeft className="size-4" />
        </button>
        {pageList(page, lastPage).map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="w-6 text-center text-sm text-muted">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={clsx(
                'grid size-10 cursor-pointer place-items-center rounded-full text-sm font-semibold transition-colors',
                p === page ? 'bg-accent text-white' : 'text-ink hover:bg-surface',
              )}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" onClick={() => onChange(page + 1)} disabled={page >= lastPage} aria-label="Next page" className={arrow}>
          <ChevronRight className="size-4" />
        </button>
      </div>
      <p className="text-xs text-muted">
        Page {page} of {lastPage}
      </p>
    </nav>
  );
}
