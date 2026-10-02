import clsx from 'clsx';
import type { Session } from '@/api/types';
import { formatPrice } from '@/lib/format';
import { FigmaIcon } from '@/components/ui/icons';

interface SessionButtonProps {
  session: Session;
  onSelect: () => void;
  /** Age-gated for this account: rendered disabled. */
  blocked?: boolean;
}

const FEW_SEATS = 5;

/** "Georgian Dub" -> "GEO", the short form the ticket stub has room for. */
function languageCode(name: string) {
  return name.slice(0, 3).toUpperCase();
}

function label(session: Session) {
  return `${session.time}, ${session.venue.name} hall ${session.hall.name}, ${session.format.name}, ${session.language.name}, from ${formatPrice(session.price)}${session.isSoldOut ? ', sold out' : `, ${session.seatsLeft} seats left`}`;
}

function SeatsLeft({ session, tone }: { session: Session; tone: 'status' | 'muted' }) {
  if (session.isSoldOut) return <span className="text-xs text-muted">Sold out</span>;
  const few = session.seatsLeft <= FEW_SEATS;
  const color = tone === 'muted' ? 'text-muted' : few ? 'text-accent' : 'text-ok';
  return (
    <span className={clsx('flex items-center gap-1 whitespace-nowrap text-xs', color)}>
      <FigmaIcon name="seats-green" className="size-3" />
      {session.seatsLeft} left
    </span>
  );
}

/**
 * Sessions page card ("Sessions time" in the design). Sold-out and age-blocked
 * sessions stay visible but disabled so the showtime is still legible.
 */
export function SessionButton({ session, onSelect, blocked = false }: SessionButtonProps) {
  const disabled = session.isSoldOut || blocked;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-label={label(session)}
      className={clsx(
        'flex w-[252px] shrink-0 flex-col gap-3 rounded-2xl border border-transparent bg-surface p-[15px] text-left transition-colors',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:border-accent',
      )}
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-lg font-extrabold leading-none">{session.time}</span>
        <span className="rounded-full bg-surface-3 px-2.5 py-[5px] text-xs font-semibold leading-none">{session.format.name}</span>
      </div>
      <div className="flex w-full items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 text-xs">
          <span className="truncate text-muted">{session.language.name}</span>
          <span className="truncate font-semibold">
            {session.venue.name} · Hall {session.hall.name}
          </span>
        </div>
        <div className="flex flex-col items-end gap-2.5">
          <SeatsLeft session={session} tone="status" />
          <span className="text-sm font-extrabold leading-none">{formatPrice(session.price)}</span>
        </div>
      </div>
    </button>
  );
}

/** Film page showtime: the ticket-shaped button from the design, with a perforated stub. */
export function SessionTicket({ session, onSelect, blocked = false }: SessionButtonProps) {
  const disabled = session.isSoldOut || blocked;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-label={label(session)}
      className={clsx(
        'group relative flex h-[81px] w-[207px] shrink-0 items-center drop-shadow-[0_1px_1px_rgb(0_0_0/0.2)] transition-transform',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:-translate-y-0.5',
      )}
    >
      <img src="/figma/ticket-body.svg" alt="" className="absolute inset-0 size-full" />
      <span className="relative flex w-[124px] flex-col items-center gap-2 py-[15px]">
        <span className="text-xl font-extrabold leading-none">{session.time}</span>
        <span className="flex items-center gap-1.5">
          <span className="text-xs text-muted" title={session.language.name}>
            {languageCode(session.language.name)}
          </span>
          <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold leading-none text-[#e3e3e3]/70">
            {session.format.name}
          </span>
        </span>
      </span>
      <span className="absolute left-[124px] top-[11px] h-[59px] border-l-[1.5px] border-dashed border-ink" />
      <span className="relative flex w-[83px] flex-col items-center gap-2 py-2.5">
        <span className="text-lg font-extrabold leading-none text-accent group-disabled:text-muted">
          {formatPrice(session.price)}
        </span>
        <SeatsLeft session={session} tone="muted" />
      </span>
    </button>
  );
}
