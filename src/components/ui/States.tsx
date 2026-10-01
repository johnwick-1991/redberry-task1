import clsx from 'clsx';
import type { ReactNode } from 'react';
import type { AgeRating } from '@/api/types';
import { errorMessage } from '@/api/errors';
import { Button } from './Button';
import { AlertIcon } from './icons';

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-14 text-center',
        className,
      )}
    >
      {icon && <div className="text-muted">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Failed request: message + retry, never a blank screen. */
export function ErrorState({
  error,
  onRetry,
  title = 'Something went wrong',
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={clsx(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-bad/30 bg-bad/5 px-6 py-12 text-center',
        className,
      )}
    >
      <AlertIcon className="size-8 text-bad" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-md text-sm text-muted">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-1">
          Try again
        </Button>
      )}
    </div>
  );
}

const ratingColors: Record<string, string> = {
  G: 'bg-ok/15 text-ok border-ok/40',
  PG: 'bg-sky-500/15 text-sky-300 border-sky-400/40',
  '12+': 'bg-warn/15 text-warn border-warn/40',
  '16+': 'bg-orange-500/15 text-orange-300 border-orange-400/40',
  '18+': 'bg-bad/15 text-bad border-bad/40',
};

export function AgeBadge({ rating, className }: { rating: AgeRating; className?: string }) {
  return (
    <span
      title={rating.description}
      className={clsx(
        'inline-flex h-6 items-center rounded-md border px-1.5 text-xs font-bold',
        ratingColors[rating.code] ?? 'border-line bg-surface-3 text-ink',
        className,
      )}
    >
      {rating.code}
    </span>
  );
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex h-6 items-center rounded-md border border-line bg-surface-3 px-2 text-xs font-semibold uppercase tracking-wide',
        className,
      )}
    >
      {children}
    </span>
  );
}
