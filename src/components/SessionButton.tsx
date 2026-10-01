import clsx from 'clsx';
import type { Session } from '@/api/types';
import { formatPrice } from '@/lib/format';

interface SessionButtonProps {
  session: Session;
  onSelect: () => void;
  /** Age-gated for this account: rendered disabled. */
  blocked?: boolean;
  showVenue?: boolean;
}

/**
 * One showtime. Sold-out sessions stay visible but disabled so the time is still legible.
 */
export function SessionButton({ session, onSelect, blocked = false, showVenue = true }: SessionButtonProps) {
  const disabled = session.isSoldOut || blocked;
  const fewLeft = !session.isSoldOut && session.seatsLeft <= 10;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-label={`${session.time}, ${session.venue.name} hall ${session.hall.name}, ${session.format.name}, ${session.language.name}, from ${formatPrice(session.price)}${session.isSoldOut ? ', sold out' : `, ${session.seatsLeft} seats left`}`}
      className={clsx(
        'group flex w-52 flex-col gap-2 rounded-xl border p-3 text-left transition-all',
        disabled
          ? 'cursor-not-allowed border-line/60 bg-surface-2/40 opacity-50'
          : 'cursor-pointer border-line bg-surface-2 hover:-translate-y-0.5 hover:border-accent hover:shadow-lg hover:shadow-accent/10',
      )}
    >
      <div className="flex items-center justify-between">
        <span className={clsx('text-xl font-bold', session.isSoldOut && 'line-through decoration-2')}>
          {session.time}
        </span>
        <span className="rounded border border-line bg-surface-3 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          {session.format.name}
        </span>
      </div>
      <p className="truncate text-xs text-muted">
        {showVenue ? `${session.venue.name} · ` : ''}Hall {session.hall.name}
      </p>
      <p className="truncate text-xs text-muted">{session.language.name}</p>
      <div className="mt-0.5 flex items-center justify-between text-xs">
        <span className="font-semibold">from {formatPrice(session.price)}</span>
        {session.isSoldOut ? (
          <span className="font-bold uppercase text-bad">Sold out</span>
        ) : (
          <span className={clsx(fewLeft ? 'font-semibold text-warn' : 'text-muted')}>
            {session.seatsLeft} seats left
          </span>
        )}
      </div>
    </button>
  );
}
