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

  const btn = 'grid size-10 place-items-center rounded-lg border text-sm font-semibold transition-colors';

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted">
        Page <span className="font-semibold text-ink">{page}</span> of{' '}
        <span className="font-semibold text-ink">{lastPage}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className={clsx(btn, 'cursor-pointer border-line hover:border-ink/40 disabled:cursor-not-allowed disabled:opacity-40')}
        >
          <ChevronLeft className="size-4" />
        </button>
        {pageList(page, lastPage).map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="w-6 text-center text-muted">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={clsx(
                btn,
                'cursor-pointer',
                p === page ? 'border-accent bg-accent text-white' : 'border-line hover:border-ink/40',
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= lastPage}
          aria-label="Next page"
          className={clsx(btn, 'cursor-pointer border-line hover:border-ink/40 disabled:cursor-not-allowed disabled:opacity-40')}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}
