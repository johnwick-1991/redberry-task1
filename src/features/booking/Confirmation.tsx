import type { Order, Session } from '@/api/types';
import { formatPrice, formatShortDate } from '@/lib/format';
import { Poster } from '@/components/MovieCards';
import { Button } from '@/components/ui/Button';
import { FigmaIcon } from '@/components/ui/icons';

/** Rendered from the server's order response, not local state. */
export function Confirmation({
  order,
  fallbackSession,
  onMyTickets,
  onClose,
}: {
  order: Order;
  fallbackSession: Session;
  onMyTickets: () => void;
  onClose: () => void;
}) {
  const session = order.session ?? fallbackSession;
  const movie = order.session?.movie ?? fallbackSession.movie;
  const venue = session.venue ?? fallbackSession.venue;

  const counts = new Map<string, number>();
  order.tickets.forEach((t) => counts.set(t.ticketType.name, (counts.get(t.ticketType.name) ?? 0) + 1));
  const ticketLine = [...counts].map(([name, n]) => `${n} x ${name}`).join(', ');

  return (
    <div className="mx-auto flex w-full max-w-[673px] flex-col items-center gap-6 py-10">
      <div className="flex w-full flex-col items-center gap-[18px]">
        <div className="flex w-[365px] flex-col items-center gap-4 text-center">
          <div className="grid size-14 animate-pop-in place-items-center rounded-[28px] bg-ok">
            <FigmaIcon name="confirm" className="size-8 text-white" />
          </div>
          <div className="flex flex-col gap-2.5">
            <h3 className="text-2xl font-extrabold leading-none">Booking confirmed!</h3>
            <p className="text-sm leading-[1.3] text-muted">Your tickets are ready. We&apos;ve sent the confirmation to your email.</p>
          </div>
          <span className="rounded-full bg-surface-3 px-5 py-1.5 text-xs font-semibold">ORDER #{order.reference}</span>
        </div>

        <div className="flex w-full flex-col gap-3 rounded-xl bg-surface p-5">
          <div className="flex gap-2.5">
            {movie && <Poster src={movie.posterUrl} title={movie.title} className="h-16 w-12 shrink-0 rounded-lg" />}
            <div className="flex min-w-0 flex-col gap-2">
              <p className="text-sm font-extrabold uppercase leading-none">{movie?.title}</p>
              <p className="text-xs text-muted">
                {venue.name} · Hall {session.hall.name} · {formatShortDate(session.date)} · {session.time}
              </p>
            </div>
          </div>
          <div className="h-px bg-surface-3" />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Seats</span>
            <span className="font-semibold">{order.tickets.map((t) => t.seatCode).join(', ')}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Tickets</span>
            <span>{ticketLine}</span>
          </div>
          <div className="h-px bg-surface-3" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">TOTAL PAID</span>
            <span className="text-lg font-extrabold leading-none">{formatPrice(order.totalPrice)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={onMyTickets}>View my tickets</Button>
        <Button variant="secondary" onClick={onClose}>
          Back to home
        </Button>
      </div>
    </div>
  );
}
