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
        'flex flex-col items-center justify-center gap-3 rounded-[20px] bg-surface px-6 py-14 text-center',
        className,
      )}
    >
      {icon && <div className="text-muted">{icon}</div>}
      <h3 className="text-lg font-extrabold">{title}</h3>
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
        'flex flex-col items-center justify-center gap-3 rounded-[20px] bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      <AlertIcon className="size-8 text-bad" />
      <h3 className="text-lg font-extrabold">{title}</h3>
      <p className="max-w-md text-sm text-muted">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-1">
          Try again
        </Button>
      )}
    </div>
  );
}

/** Age rating pill: red tint, as on every card in the design. */
export function AgeBadge({ rating, className }: { rating: AgeRating; className?: string }) {
  return (
    <span
      title={rating.description}
      className={clsx(
        'inline-flex items-center rounded-full bg-tint-red px-2 py-1 text-xs font-semibold leading-none text-accent',
        className,
      )}
    >
      {rating.code}
    </span>
  );
}

/** Neutral pill (formats, runtime). `raised` is the solid variant used on session cards. */
export function Chip({
  children,
  className,
  tone = 'tint',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'tint' | 'raised';
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full text-xs font-semibold leading-none text-ink',
        tone === 'raised' ? 'bg-surface-3 px-2.5 py-[5px]' : 'bg-tint-white px-3 py-1.5',
        className,
      )}
    >
      {children}
    </span>
  );
}
